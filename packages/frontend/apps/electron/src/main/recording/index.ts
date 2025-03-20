import path from 'node:path';

import { ShareableContent } from '@affine/native';
import { app } from 'electron';
import fs from 'fs-extra';
import { debounce } from 'lodash-es';
import {
  BehaviorSubject,
  distinctUntilChanged,
  groupBy,
  interval,
  mergeMap,
  Subject,
  throttleTime,
} from 'rxjs';

import { isMacOS, shallowEqual } from '../../shared/utils';
import { beforeAppQuit } from '../cleanup';
import { logger } from '../logger';
import type { NamespaceHandlers } from '../type';
import { getMainWindow } from '../windows-manager';
import { popupManager } from '../windows-manager/popup';
import type {
  AppGroupInfo,
  Recording,
  RecordingStatus,
  TappableAppInfo,
} from './types';

const subscribers: Subscriber[] = [];

// TODO(@pengx17): remove recordings after they are consumed in the editor
const SAVED_RECORDINGS_DIR = path.join(
  app.getPath('sessionData'),
  'recordings'
);

beforeAppQuit(() => {
  subscribers.forEach(subscriber => {
    try {
      subscriber.unsubscribe();
    } catch {
      // ignore unsubscribe error
    }
  });
});

let shareableContent: ShareableContent | null = null;

export const applications$ = new BehaviorSubject<TappableAppInfo[]>([]);
export const appGroups$ = new BehaviorSubject<AppGroupInfo[]>([]);

export const updateApplicationsPing$ = new Subject<number>();

// recording id -> recording
// recordings will be saved in memory before consumed and created as an audio block to user's doc
const recordings = new Map<number, Recording>();

// there should be only one active recording at a time
export const recordingStatus$ = new BehaviorSubject<RecordingStatus | null>(
  null
);

function createAppGroup(processGroupId: number): AppGroupInfo | undefined {
  const groupProcess =
    shareableContent?.applicationWithProcessId(processGroupId);
  if (!groupProcess) {
    return;
  }
  return {
    processGroupId: processGroupId,
    apps: [], // leave it empty for now.
    name: groupProcess.name,
    bundleIdentifier: groupProcess.bundleIdentifier,
    // icon should be lazy loaded
    get icon() {
      try {
        return groupProcess.icon;
      } catch (error) {
        logger.error(`Failed to get icon for ${groupProcess.name}`, error);
        return undefined;
      }
    },
    isRunning: false,
  };
}

// pipe applications$ to appGroups$
function setupAppGroups() {
  subscribers.push(
    applications$.pipe(distinctUntilChanged()).subscribe(apps => {
      const appGroups: AppGroupInfo[] = [];
      apps.forEach(app => {
        let appGroup = appGroups.find(
          group => group.processGroupId === app.processGroupId
        );

        if (!appGroup) {
          appGroup = createAppGroup(app.processGroupId);
          if (appGroup) {
            appGroups.push(appGroup);
          }
        }
        if (appGroup) {
          appGroup.apps.push(app);
        }
      });

      appGroups.forEach(appGroup => {
        appGroup.isRunning = appGroup.apps.some(app => app.isRunning);
      });

      appGroups$.next(appGroups);
    })
  );
}

function setupNewRunningAppGroup() {
  const appGroupRunningChanged$ = appGroups$.pipe(
    mergeMap(groups => groups),
    groupBy(group => group.processGroupId),
    mergeMap(groupStream$ =>
      groupStream$.pipe(
        distinctUntilChanged((prev, curr) => prev.isRunning === curr.isRunning)
      )
    )
  );

  appGroups$.value.forEach(group => {
    const recordingStatus = recordingStatus$.value;
    if (
      group.isRunning &&
      (!recordingStatus || recordingStatus.status === 'new')
    ) {
      newRecording(group);
    }
  });

  subscribers.push(
    appGroupRunningChanged$.subscribe(currentGroup => {
      logger.info(
        'appGroupRunningChanged',
        currentGroup.bundleIdentifier,
        currentGroup.isRunning
      );
      const recordingStatus = recordingStatus$.value;
      if (
        currentGroup.isRunning &&
        (!recordingStatus || recordingStatus.status === 'ready')
      ) {
        newRecording(currentGroup);
        return;
      }
      if (
        !currentGroup.isRunning &&
        recordingStatus?.status === 'new' &&
        currentGroup.bundleIdentifier ===
          recordingStatus.appGroup?.bundleIdentifier
      ) {
        removeRecording(recordingStatus.id);
      }
    })
  );
}

function createRecording(status: RecordingStatus) {
  const bufferedFilePath = path.join(
    SAVED_RECORDINGS_DIR,
    `${status.appGroup?.bundleIdentifier ?? 'unknown'}-${status.id}-${status.startTime}.raw`
  );

  fs.ensureDirSync(SAVED_RECORDINGS_DIR);
  const file = fs.createWriteStream(bufferedFilePath);

  function tapAudioSamples(err: Error | null, samples: Float32Array) {
    const recordingStatus = recordingStatus$.getValue();
    if (
      !recordingStatus ||
      recordingStatus.id !== status.id ||
      recordingStatus.status === 'paused'
    ) {
      return;
    }

    if (err) {
      logger.error('failed to get audio samples', err);
    } else {
      // Writing raw Float32Array samples directly to file
      // For stereo audio, samples are interleaved [L,R,L,R,...]
      file.write(Buffer.from(samples.buffer));
    }
  }

  const stream = status.app
    ? status.app.rawInstance.tapAudio(tapAudioSamples)
    : ShareableContent.tapGlobalAudio(null, tapAudioSamples);

  const recording: Recording = {
    id: status.id,
    startTime: status.startTime,
    app: status.app,
    appGroup: status.appGroup,
    file,
    stream,
  };

  return recording;
}

export async function getRecording(id: number) {
  const recording = recordings.get(id);
  if (!recording) {
    logger.error(`Recording ${id} not found`);
    return;
  }
  const rawFilePath = String(recording.file.path);
  return {
    id,
    appGroup: recording.appGroup,
    app: recording.app,
    startTime: recording.startTime,
    filepath: rawFilePath,
    sampleRate: recording.stream.sampleRate,
    numberOfChannels: recording.stream.channels,
  };
}

// recording popup status
// new: recording is started, popup is shown
// recording: recording is started, popup is shown
// stopped: recording is stopped, popup showing processing status
// ready: recording is ready, show "open app" button
// null: hide popup
function setupRecordingListeners() {
  subscribers.push(
    recordingStatus$
      .pipe(distinctUntilChanged(shallowEqual))
      .subscribe(status => {
        const popup = popupManager.get('recording');

        if (status && !popup.showing) {
          popup.show().catch(err => {
            logger.error('failed to show recording popup', err);
          });
        }

        if (status?.status === 'recording') {
          let recording = recordings.get(status.id);
          // create a recording if not exists
          if (!recording) {
            recording = createRecording(status);
            recordings.set(status.id, recording);
          }
        } else if (status?.status === 'stopped') {
          const recording = recordings.get(status.id);
          if (recording) {
            recording.stream.stop();
          }
        } else if (status?.status === 'ready') {
          // show the popup for 10s
          setTimeout(() => {
            // check again if current status is still ready
            if (
              recordingStatus$.value?.status === 'ready' &&
              recordingStatus$.value.id === status.id
            ) {
              popup.hide().catch(err => {
                logger.error('failed to hide recording popup', err);
              });
            }
          }, 10_000);
        } else if (!status) {
          // status is removed, we should hide the popup
          popupManager
            .get('recording')
            .hide()
            .catch(err => {
              logger.error('failed to hide recording popup', err);
            });
        }
      })
  );
}

function getAllApps(): TappableAppInfo[] {
  if (!shareableContent) {
    return [];
  }
  const apps = shareableContent.applications().map(app => {
    try {
      return {
        rawInstance: app,
        processId: app.processId,
        processGroupId: app.processGroupId,
        bundleIdentifier: app.bundleIdentifier,
        name: app.name,
        isRunning: app.isRunning,
      };
    } catch (error) {
      logger.error('failed to get app info', error);
      return null;
    }
  });

  const filteredApps = apps.filter(
    (v): v is TappableAppInfo =>
      v !== null &&
      !v.bundleIdentifier.startsWith('com.apple') &&
      v.processId !== process.pid
  );
  return filteredApps;
}

type Subscriber = {
  unsubscribe: () => void;
};

function setupMediaListeners() {
  applications$.next(getAllApps());
  subscribers.push(
    interval(3000).subscribe(() => {
      updateApplicationsPing$.next(Date.now());
    }),
    ShareableContent.onApplicationListChanged(() => {
      updateApplicationsPing$.next(Date.now());
    }),
    updateApplicationsPing$
      .pipe(distinctUntilChanged(), throttleTime(3000))
      .subscribe(() => {
        applications$.next(getAllApps());
      })
  );

  let appStateSubscribers: Subscriber[] = [];

  subscribers.push(
    applications$.subscribe(apps => {
      appStateSubscribers.forEach(subscriber => {
        try {
          subscriber.unsubscribe();
        } catch {
          // ignore unsubscribe error
        }
      });
      const _appStateSubscribers: Subscriber[] = [];

      apps.forEach(app => {
        try {
          const tappableApp = app.rawInstance;
          const debouncedAppStateChanged = debounce(() => {
            applications$.next(getAllApps());
          }, 100);
          _appStateSubscribers.push(
            ShareableContent.onAppStateChanged(tappableApp, () => {
              debouncedAppStateChanged();
            })
          );
        } catch (error) {
          logger.error(
            `Failed to convert app ${app.name} to TappableApplication`,
            error
          );
        }
      });

      appStateSubscribers = _appStateSubscribers;
      return () => {
        _appStateSubscribers.forEach(subscriber => {
          try {
            subscriber.unsubscribe();
          } catch {
            // ignore unsubscribe error
          }
        });
      };
    })
  );
}

export function setupRecording() {
  if (!isMacOS()) {
    return;
  }

  if (!shareableContent) {
    try {
      shareableContent = new ShareableContent();
      setupMediaListeners();
    } catch (error) {
      logger.error('failed to get shareable content', error);
    }
  }
  setupAppGroups();
  setupNewRunningAppGroup();
  setupRecordingListeners();
}

let recordingId = 0;

export function newRecording(
  appGroup?: AppGroupInfo | number
): RecordingStatus | undefined {
  if (!shareableContent) {
    return; // likely called on unsupported platform
  }

  if (typeof appGroup === 'number') {
    appGroup = appGroups$.value.find(
      group => group.processGroupId === appGroup
    );
  }

  // hmm, is it possible that there are multiple apps running (listening) in the same group?
  const appInfo = appGroup?.apps.find(app => app.isRunning);

  const recordingStatus: RecordingStatus = {
    id: recordingId++,
    status: 'new',
    startTime: Date.now(),
    app: appInfo,
    appGroup,
  };

  recordingStatus$.next(recordingStatus);

  return recordingStatus;
}

export function startRecording(
  appGroup?: AppGroupInfo | number
): RecordingStatus | undefined {
  const currentRecordingStatus = recordingStatus$.value;
  // cannot start a new recording if there is already a recording
  if (currentRecordingStatus?.status === 'recording') {
    logger.error(
      'cannot start a new recording if there is already a recording'
    );
    return;
  }

  if (typeof appGroup === 'number') {
    appGroup = appGroups$.value.find(
      group => group.processGroupId === appGroup
    );
  }

  // if currentRecordingStatus is "new" with the same appGroup, we should reuse it
  if (
    currentRecordingStatus?.status === 'new' &&
    currentRecordingStatus.appGroup?.processGroupId === appGroup?.processGroupId
  ) {
    recordingStatus$.next({
      ...currentRecordingStatus,
      status: 'recording',
    });
    return currentRecordingStatus;
  }

  // hmm, is it possible that there are multiple apps running (listening) in the same group?
  const appInfo = appGroup?.apps.find(app => app.isRunning);

  const recordingStatus: RecordingStatus = {
    id: recordingId++,
    status: 'recording',
    startTime: Date.now(),
    app: appInfo,
    appGroup,
  };

  recordingStatus$.next(recordingStatus);

  return recordingStatus;
}

export function pauseRecording() {
  const recordingStatus = recordingStatus$.value;
  if (!recordingStatus) {
    return;
  }

  recordingStatus$.next({
    ...recordingStatus,
    status: 'paused',
  });
}

export function resumeRecording() {
  const recordingStatus = recordingStatus$.value;
  if (!recordingStatus) {
    return;
  }

  recordingStatus$.next({
    ...recordingStatus,
    status: 'recording',
  });
}

export async function stopRecording() {
  const recordingStatus = recordingStatus$.value;
  if (!recordingStatus) {
    logger.error('No recording status to stop');
    return;
  }
  const recording = recordings.get(recordingStatus?.id);
  if (!recording) {
    logger.error(`Recording ${recordingStatus?.id} not found`);
    return;
  }

  const { file } = recording;
  file.end();

  const newRecordingStatus: RecordingStatus = {
    ...recordingStatus,
    filepath: String(file.path),
    sampleRate: recording.stream.sampleRate,
    numberOfChannels: recording.stream.channels,
    status: 'stopped',
  };

  recordingStatus$.next(newRecordingStatus);

  await new Promise<void>(resolve => {
    file.on('finish', () => {
      resolve();
    });
  });
  return serializeRecordingStatus(newRecordingStatus);
}

export async function saveEncodedRecording(id: number, buffer: Buffer) {
  const recordingStatus = recordingStatus$.value;
  const recording = recordings.get(id);
  if (!recordingStatus || recordingStatus.id !== id || !recording) {
    logger.error(`Recording ${id} not found`);
    return;
  }

  const filepath = path.join(
    SAVED_RECORDINGS_DIR,
    `${recordingStatus.appGroup?.bundleIdentifier ?? 'unknown'}-${recordingStatus.id}-${recordingStatus.startTime}.webm`
  );

  await fs.writeFile(filepath, buffer);

  recordingStatus$.next({
    ...recordingStatus,
    status: 'ready',
    filepath,
    sampleRate: recording.stream.sampleRate,
    numberOfChannels: recording.stream.channels,
  });

  // bring up the window
  getMainWindow()
    .then(mainWindow => {
      if (mainWindow) {
        mainWindow.show();
      }
    })
    .catch(err => {
      logger.error('failed to bring up the window', err);
    });
}

function removeRecording(id: number) {
  recordings.delete(id);
  if (recordingStatus$.value?.id === id) {
    recordingStatus$.next(null);
  }
}

export interface SerializedRecordingStatus {
  id: number;
  status: RecordingStatus['status'];
  appName?: string;
  // if there is no app group, it means the recording is for system audio
  appGroupId?: number;
  icon?: Buffer;
  startTime: number;
  filepath?: string;
  sampleRate?: number;
  numberOfChannels?: number;
}

function serializeRecordingStatus(
  status: RecordingStatus
): SerializedRecordingStatus {
  return {
    id: status.id,
    status: status.status,
    appName: status.appGroup?.name,
    appGroupId: status.appGroup?.processGroupId,
    icon: status.appGroup?.icon,
    startTime: status.startTime,
    filepath: status.filepath,
    sampleRate: status.sampleRate,
    numberOfChannels: status.numberOfChannels,
  };
}

export const recordingHandlers = {
  getRecording: async (_, id: number) => {
    return getRecording(id);
  },
  getCurrentRecording: async () => {
    // not all properties are serializable, so we need to return a subset of the status
    return recordingStatus$.value
      ? serializeRecordingStatus(recordingStatus$.value)
      : null;
  },
  deleteCachedRecording: async (_, id: number) => {
    const recording = recordings.get(id);
    if (recording) {
      recording.stream.stop();
      recordings.delete(id);
      await fs.unlink(recording.file.path);
    }
    return true;
  },
  startRecording: async (_, appGroup?: AppGroupInfo | number) => {
    return startRecording(appGroup);
  },
  pauseRecording: async () => {
    return pauseRecording();
  },
  stopRecording: async () => {
    return stopRecording();
  },
  // save the encoded recording buffer to the file system
  saveEncodedRecording: async (_, id: number, buffer: Uint8Array) => {
    return saveEncodedRecording(id, Buffer.from(buffer));
  },
} satisfies NamespaceHandlers;

export const recordingEvents = {
  onRecordingStatusChanged: (
    fn: (status: SerializedRecordingStatus | null) => void
  ) => {
    const sub = recordingStatus$.subscribe(status => {
      fn(status ? serializeRecordingStatus(status) : null);
    });
    return () => {
      try {
        sub.unsubscribe();
      } catch {
        // ignore unsubscribe error
      }
    };
  },
};
