/* eslint-disable @typescript-eslint/no-misused-promises */
import { exec } from 'node:child_process';
import { createServer } from 'node:http';
import { promisify } from 'node:util';

import {
  type Application,
  type AudioTapStream,
  ShareableContent,
} from '@affine/native';
import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs-extra';
import { Server } from 'socket.io';

import { gemini, type TranscriptionResult } from './gemini';
import { WavWriter } from './wav-writer';

// Constants
const RECORDING_DIR = './recordings';
const PORT = process.env.PORT || 6544;

// Ensure recordings directory exists
fs.ensureDirSync(RECORDING_DIR);
console.log(`📁 Ensuring recordings directory exists at ${RECORDING_DIR}`);

// Types
interface Recording {
  app: Application;
  appGroup: Application | null;
  buffers: Float32Array[];
  stream: AudioTapStream;
  startTime: number;
  isWriting: boolean;
}

interface RecordingStatus {
  processId: number;
  bundleIdentifier: string;
  name: string;
  startTime: number;
  duration: number;
}

interface RecordingMetadata {
  appName: string;
  bundleIdentifier: string;
  processId: number;
  recordingStartTime: number;
  recordingEndTime: number;
  recordingDuration: number;
  sampleRate: number;
  totalSamples: number;
}

interface AppInfo {
  app: Application;
  processId: number;
  processGroupId: number | null;
  bundleIdentifier: string;
  name: string;
  running: boolean;
}

interface TranscriptionMetadata {
  transcriptionStartTime: number;
  transcriptionEndTime: number;
  transcriptionStatus: 'not_started' | 'pending' | 'completed' | 'error';
  transcription?: TranscriptionResult;
  error?: string;
}

// State
const recordingMap = new Map<number, Recording>();
let appsSubscriber = () => {};
let fsWatcher: FSWatcher | null = null;

// Server setup
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());

// Update the static file serving to handle the new folder structure
app.use(
  '/recordings',
  (req, res, next) => {
    // Extract the folder name from the path
    const parts = req.path.split('/');
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Invalid request path' });
    }

    const folderName = parts[1];
    if (!validateAndSanitizeFolderName(folderName)) {
      return res.status(400).json({ error: 'Invalid folder name format' });
    }

    if (req.path.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (req.path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
    next();
  },
  express.static(RECORDING_DIR)
);

// Recording management
async function saveRecording(recording: Recording): Promise<string | null> {
  try {
    recording.isWriting = true;
    const app = recording.appGroup || recording.app;

    const totalSamples = recording.buffers.reduce(
      (acc, buf) => acc + buf.length,
      0
    );

    const recordingEndTime = Date.now();
    const recordingDuration = (recordingEndTime - recording.startTime) / 1000;
    const expectedSamples = recordingDuration * 44100;

    console.log(`💾 Saving recording for ${app.name}:`);
    console.log(`- Process ID: ${app.processId}`);
    console.log(`- Bundle ID: ${app.bundleIdentifier}`);
    console.log(`- Actual duration: ${recordingDuration.toFixed(2)}s`);
    console.log(`- Expected samples: ${Math.floor(expectedSamples)}`);
    console.log(`- Actual samples: ${totalSamples}`);
    console.log(
      `- Sample ratio: ${(totalSamples / expectedSamples).toFixed(2)}`
    );

    // Create a buffer for the mono audio
    const buffer = new Float32Array(totalSamples);
    let offset = 0;
    recording.buffers.forEach(buf => {
      buffer.set(buf, offset);
      offset += buf.length;
    });

    await fs.ensureDir(RECORDING_DIR);

    const timestamp = Date.now();
    const baseFilename = `${recording.app.bundleIdentifier}-${recording.app.processId}-${timestamp}`;
    const recordingDir = `${RECORDING_DIR}/${baseFilename}`;
    await fs.ensureDir(recordingDir);

    const wavFilename = `${recordingDir}/recording.wav`;
    const transcriptionWavFilename = `${recordingDir}/transcription.wav`;
    const metadataFilename = `${recordingDir}/metadata.json`;
    const iconFilename = `${recordingDir}/icon.png`;

    // Save high-quality WAV file for playback (44.1kHz)
    console.log(`📝 Writing high-quality WAV file to ${wavFilename}`);
    const writer = new WavWriter(wavFilename, { targetSampleRate: 44100 });
    writer.write(buffer);
    await writer.end();
    console.log('✅ High-quality WAV file written successfully');

    // Save low-quality WAV file for transcription (8kHz)
    console.log(
      `📝 Writing transcription WAV file to ${transcriptionWavFilename}`
    );
    const transcriptionWriter = new WavWriter(transcriptionWavFilename, {
      targetSampleRate: 8000,
    });
    transcriptionWriter.write(buffer);
    await transcriptionWriter.end();
    console.log('✅ Transcription WAV file written successfully');

    // Save app icon if available
    if (app.icon) {
      console.log(`📝 Writing app icon to ${iconFilename}`);
      await fs.writeFile(iconFilename, app.icon);
      console.log('✅ App icon written successfully');
    }

    console.log(`📝 Writing metadata to ${metadataFilename}`);
    // Save metadata (without icon)
    const metadata: RecordingMetadata = {
      appName: app.name,
      bundleIdentifier: app.bundleIdentifier,
      processId: app.processId,
      recordingStartTime: recording.startTime,
      recordingEndTime,
      recordingDuration,
      sampleRate: 44100,
      totalSamples,
    };

    await fs.writeJson(metadataFilename, metadata, { spaces: 2 });
    console.log('✅ Metadata file written successfully');

    return baseFilename;
  } catch (error) {
    console.error('❌ Error saving recording:', error);
    return null;
  }
}

function getRecordingStatus(): RecordingStatus[] {
  return Array.from(recordingMap.entries()).map(([processId, recording]) => ({
    processId,
    bundleIdentifier: recording.app.bundleIdentifier,
    name: recording.app.name,
    startTime: recording.startTime,
    duration: Date.now() - recording.startTime,
  }));
}

function emitRecordingStatus() {
  io.emit('apps:recording', { recordings: getRecordingStatus() });
}

async function startRecording(app: Application) {
  if (recordingMap.has(app.processId)) {
    console.log(
      `⚠️ Recording already in progress for ${app.name} (PID: ${app.processId})`
    );
    return;
  }

  // Find the root app of the process group
  const processGroupId = await getProcessGroupId(app.processId);
  const rootApp = processGroupId
    ? (shareableContent
        .applications()
        .find(a => a.processId === processGroupId) ?? app)
    : app;

  console.log(
    `🎙️ Starting recording for ${rootApp.name} (PID: ${rootApp.processId})`
  );

  const buffers: Float32Array[] = [];
  const stream = app.tapAudio((err, samples) => {
    if (err) {
      console.error(`❌ Audio stream error for ${rootApp.name}:`, err);
      return;
    }
    const recording = recordingMap.get(app.processId);
    if (recording && !recording.isWriting) {
      buffers.push(new Float32Array(samples));
    }
  });

  recordingMap.set(app.processId, {
    app,
    appGroup: rootApp,
    buffers,
    stream,
    startTime: Date.now(),
    isWriting: false,
  });

  console.log(`✅ Recording started successfully for ${rootApp.name}`);
  emitRecordingStatus();
}

async function stopRecording(processId: number) {
  const recording = recordingMap.get(processId);
  if (!recording) {
    console.log(`ℹ️ No active recording found for process ID ${processId}`);
    return;
  }

  const app = recording.appGroup || recording.app;

  console.log(`⏹️ Stopping recording for ${app.name} (PID: ${app.processId})`);
  console.log(
    `⏱️ Recording duration: ${((Date.now() - recording.startTime) / 1000).toFixed(2)}s`
  );

  recording.stream.stop();
  const filename = await saveRecording(recording);
  recordingMap.delete(processId);

  if (filename) {
    console.log(`✅ Recording saved successfully to ${filename}`);
  } else {
    console.error(`❌ Failed to save recording for ${app.name}`);
  }

  emitRecordingStatus();
  return filename;
}

// File management
async function getRecordings(): Promise<
  {
    wav: string;
    metadata?: RecordingMetadata;
    transcription?: TranscriptionMetadata;
  }[]
> {
  try {
    const allItems = await fs.readdir(RECORDING_DIR);

    // First filter out non-directories
    const dirs = (
      await Promise.all(
        allItems.map(async item => {
          const fullPath = `${RECORDING_DIR}/${item}`;
          try {
            const stat = await fs.stat(fullPath);
            return stat.isDirectory() ? item : null;
          } catch {
            return null;
          }
        })
      )
    ).filter((d): d is string => d !== null);

    const recordings = await Promise.all(
      dirs.map(async dir => {
        try {
          const recordingPath = `${RECORDING_DIR}/${dir}`;
          const metadataPath = `${recordingPath}/metadata.json`;
          const transcriptionPath = `${recordingPath}/transcription.json`;

          let metadata: RecordingMetadata | undefined;
          try {
            metadata = await fs.readJson(metadataPath);
          } catch {
            // Metadata might not exist
          }

          let transcription: TranscriptionMetadata | undefined;
          try {
            // Check if transcription file exists
            const transcriptionExists = await fs.pathExists(transcriptionPath);
            if (transcriptionExists) {
              transcription = await fs.readJson(transcriptionPath);
            } else {
              // If transcription.wav exists but no transcription.json, it means transcription is available but not started
              transcription = {
                transcriptionStartTime: 0,
                transcriptionEndTime: 0,
                transcriptionStatus: 'not_started',
              };
            }
          } catch (error) {
            console.error(`Error reading transcription for ${dir}:`, error);
          }

          return {
            wav: dir,
            metadata,
            transcription,
          };
        } catch (error) {
          console.error(`Error processing directory ${dir}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls and sort by recording start time
    return recordings
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort(
        (a, b) =>
          (b.metadata?.recordingStartTime ?? 0) -
          (a.metadata?.recordingStartTime ?? 0)
      );
  } catch (error) {
    console.error('Error reading recordings directory:', error);
    return [];
  }
}

async function setupRecordingsWatcher() {
  if (fsWatcher) {
    console.log('🔄 Closing existing recordings watcher');
    await fsWatcher.close();
  }

  try {
    console.log('👀 Setting up recordings watcher...');
    const files = await getRecordings();
    console.log(`📊 Found ${files.length} existing recordings`);
    io.emit('apps:saved', { recordings: files });

    fsWatcher = chokidar.watch(RECORDING_DIR, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    // Handle file events
    fsWatcher
      .on('add', async path => {
        if (path.endsWith('.wav') || path.endsWith('.json')) {
          console.log(`📝 File added: ${path}`);
          const files = await getRecordings();
          io.emit('apps:saved', { recordings: files });
        }
      })
      .on('change', async path => {
        if (path.endsWith('.wav') || path.endsWith('.json')) {
          console.log(`📝 File changed: ${path}`);
          const files = await getRecordings();
          io.emit('apps:saved', { recordings: files });
        }
      })
      .on('unlink', async path => {
        if (path.endsWith('.wav') || path.endsWith('.json')) {
          console.log(`🗑️ File removed: ${path}`);
          const files = await getRecordings();
          io.emit('apps:saved', { recordings: files });
        }
      })
      .on('error', error => {
        console.error('❌ Error watching recordings directory:', error);
      })
      .on('ready', () => {
        console.log('✅ Recordings watcher setup complete');
      });
  } catch (error) {
    console.error('❌ Error setting up recordings watcher:', error);
  }
}

// Process management
async function getProcessGroupId(pid: number): Promise<number | null> {
  try {
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(`ps -o pgid -p ${pid}`);
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) return null;

    const pgid = parseInt(lines[1].trim(), 10);
    return isNaN(pgid) ? null : pgid;
  } catch {
    return null;
  }
}

// Application management
const shareableContent = new ShareableContent();

async function getAllApps(): Promise<AppInfo[]> {
  const apps = await Promise.all(
    shareableContent.applications().map(async app => {
      try {
        return {
          app,
          processId: app.processId,
          processGroupId: await getProcessGroupId(app.processId),
          bundleIdentifier: app.bundleIdentifier,
          name: app.name,
          running: app.isRunning,
        };
      } catch (error) {
        console.error(error);
        return null;
      }
    })
  );

  const filteredApps = apps.filter(
    (v): v is AppInfo =>
      v !== null && !v.bundleIdentifier.startsWith('com.apple')
  );

  // Stop recording if app is not listed
  await Promise.all(
    filteredApps.map(async ({ app }) => {
      if (!filteredApps.some(a => a.processId === app.processId)) {
        await stopRecording(app.processId);
      }
    })
  );

  return filteredApps;
}

function listenToAppStateChanges(apps: AppInfo[]) {
  const subscribers = apps.map(({ app }) => {
    return ShareableContent.onAppStateChanged(app, () => {
      setTimeout(() => {
        console.log(
          `🔄 Application state changed: ${app.name} (PID: ${app.processId}) is now ${
            app.isRunning ? '▶️ running' : '⏹️ stopped'
          }`
        );
        io.emit('apps:state-changed', {
          processId: app.processId,
          running: app.isRunning,
        });
        if (!app.isRunning) {
          stopRecording(app.processId).catch(error => {
            console.error('❌ Error stopping recording:', error);
          });
        }
      }, 50);
    });
  });

  appsSubscriber();
  appsSubscriber = () => {
    subscribers.forEach(subscriber => subscriber.unsubscribe());
  };
}

// Socket.IO setup
io.on('connection', async socket => {
  console.log('🔌 New client connected');
  const initialApps = await getAllApps();
  console.log(`📤 Sending ${initialApps.length} applications to new client`);
  socket.emit('apps:all', { apps: initialApps });
  socket.emit('apps:recording', { recordings: getRecordingStatus() });

  const files = await getRecordings();
  console.log(`📤 Sending ${files.length} saved recordings to new client`);
  socket.emit('apps:saved', { recordings: files });

  listenToAppStateChanges(initialApps);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected');
  });
});

// Application list change listener
ShareableContent.onApplicationListChanged(() => {
  (async () => {
    try {
      console.log('🔄 Application list changed, updating clients...');
      const apps = await getAllApps();
      console.log(`📢 Broadcasting ${apps.length} applications to all clients`);
      io.emit('apps:all', { apps });
    } catch (error) {
      console.error('❌ Error handling application list change:', error);
    }
  })().catch(error => {
    console.error('❌ Error in application list change handler:', error);
  });
});

// API Routes
const rateLimiter = rateLimit({
  windowMs: 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});

app.get('/permissions', (req, res) => {
  const permission = shareableContent.checkRecordingPermissions();
  res.json({ permission });
});

app.get('/apps', async (_req, res) => {
  const apps = await getAllApps();
  listenToAppStateChanges(apps);
  res.json({ apps });
});

app.get('/apps/saved', rateLimiter, async (_req, res) => {
  const files = await getRecordings();
  res.json({ recordings: files });
});

// Utility function to validate and sanitize folder name
function validateAndSanitizeFolderName(folderName: string): string | null {
  // Allow alphanumeric characters, hyphens, dots (for bundle IDs)
  // Format: bundleId-processId-timestamp
  if (!/^[\w.-]+-\d+-\d+$/.test(folderName)) {
    return null;
  }

  // Remove any path traversal attempts
  const sanitized = folderName.replace(/^\.+|\.+$/g, '').replace(/[/\\]/g, '');
  return sanitized;
}

app.delete('/recordings/:foldername', rateLimiter, async (req, res) => {
  const foldername = validateAndSanitizeFolderName(req.params.foldername);
  if (!foldername) {
    console.error('❌ Invalid folder name format:', req.params.foldername);
    return res.status(400).json({ error: 'Invalid folder name format' });
  }

  const recordingDir = `${RECORDING_DIR}/${foldername}`;

  try {
    // Ensure the resolved path is within RECORDING_DIR
    const resolvedPath = await fs.realpath(recordingDir);
    const recordingDirPath = await fs.realpath(RECORDING_DIR);

    if (!resolvedPath.startsWith(recordingDirPath)) {
      console.error('❌ Path traversal attempt detected:', {
        resolvedPath,
        recordingDirPath,
        requestedFile: foldername,
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`🗑️ Deleting recording folder: ${foldername}`);
    await fs.remove(recordingDir);
    console.log('✅ Recording folder deleted successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === 'ENOENT') {
      console.error('❌ Folder not found:', recordingDir);
      res.status(404).json({ error: 'Folder not found' });
    } else {
      console.error('❌ Error deleting folder:', {
        error: typedError,
        code: typedError.code,
        message: typedError.message,
        path: recordingDir,
      });
      res.status(500).json({
        error: `Failed to delete folder: ${typedError.message || 'Unknown error'}`,
      });
    }
  }
});

app.get('/apps/:process_id/icon', (req, res) => {
  const processId = parseInt(req.params.process_id);
  try {
    const app = shareableContent.applicationWithProcessId(processId);
    const icon = app.icon;
    res.set('Content-Type', 'image/png');
    res.send(icon);
  } catch {
    res.status(404).json({ error: 'App icon not found' });
  }
});

app.post('/apps/:process_id/record', async (req, res) => {
  const processId = parseInt(req.params.process_id);
  const app = shareableContent.applicationWithProcessId(processId);
  await startRecording(app);
  res.json({ success: true });
});

app.post('/apps/:process_id/stop', async (req, res) => {
  const processId = parseInt(req.params.process_id);
  await stopRecording(processId);
  res.json({ success: true });
});

// Update transcription endpoint to use folder validation
app.post(
  '/recordings/:foldername/transcribe',
  rateLimiter,
  async (req, res) => {
    const foldername = validateAndSanitizeFolderName(req.params.foldername);
    if (!foldername) {
      console.error('❌ Invalid folder name format:', req.params.foldername);
      return res.status(400).json({ error: 'Invalid folder name format' });
    }

    const recordingDir = `${RECORDING_DIR}/${foldername}`;

    try {
      // Check if directory exists
      await fs.access(recordingDir);

      const transcriptionWavPath = `${recordingDir}/transcription.wav`;
      const transcriptionMetadataPath = `${recordingDir}/transcription.json`;

      // Check if transcription file exists
      await fs.access(transcriptionWavPath);

      // Create initial transcription metadata
      const initialMetadata: TranscriptionMetadata = {
        transcriptionStartTime: Date.now(),
        transcriptionEndTime: 0,
        transcriptionStatus: 'pending',
      };
      await fs.writeJson(transcriptionMetadataPath, initialMetadata);

      // Notify clients that transcription has started
      io.emit('apps:recording-transcription-start', { filename: foldername });

      const transcription = await gemini(transcriptionWavPath, {
        mode: 'transcript',
      });

      // Update transcription metadata with results
      const metadata: TranscriptionMetadata = {
        transcriptionStartTime: initialMetadata.transcriptionStartTime,
        transcriptionEndTime: Date.now(),
        transcriptionStatus: 'completed',
        transcription: transcription ?? undefined,
      };

      await fs.writeJson(transcriptionMetadataPath, metadata);

      // Notify clients that transcription is complete
      io.emit('apps:recording-transcription-end', {
        filename: foldername,
        success: true,
        transcription,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error during transcription:', error);

      // Update transcription metadata with error
      const metadata: TranscriptionMetadata = {
        transcriptionStartTime: Date.now(),
        transcriptionEndTime: Date.now(),
        transcriptionStatus: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await fs
        .writeJson(`${recordingDir}/transcription.json`, metadata)
        .catch(err => {
          console.error('❌ Error saving transcription metadata:', err);
        });

      // Notify clients of transcription error
      io.emit('apps:recording-transcription-end', {
        filename: foldername,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Start server
httpServer.listen(PORT, () => {
  console.log(`
🎙️  Media Capture Server started successfully:
- Port: ${PORT}
- Recordings directory: ${RECORDING_DIR}
- Sample rate: 44.1kHz
- Channels: Mono
`);
});

// Initialize file watcher
setupRecordingsWatcher().catch(error => {
  console.error('Failed to setup recordings watcher:', error);
});
