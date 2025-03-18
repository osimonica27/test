import type { AudioTapStream, TappableApplication } from '@affine/native';

export interface TappableAppInfo {
  rawInstance: TappableApplication;
  isRunning: boolean;
  processId: number;
  processGroupId: number;
  bundleIdentifier: string;
  name: string;
}

export interface AppGroupInfo {
  processGroupId: number;
  apps: TappableAppInfo[];
  name: string;
  bundleIdentifier: string;
  icon: Buffer | undefined;
  isRunning: boolean;
}

export interface Recording {
  id: number;
  // the app may not be available if the user choose to record system audio
  app?: TappableAppInfo;
  appGroup?: AppGroupInfo;
  // the raw audio buffers that are already accumulated
  buffers: Float32Array[];
  stream: AudioTapStream;
  startTime: number;
}

export interface RecordingStatus {
  id: number; // corresponds to the recording id
  status: 'recording' | 'paused' | 'stopped';
  app?: TappableAppInfo;
  appGroup?: AppGroupInfo;
  startTime: number;
}
