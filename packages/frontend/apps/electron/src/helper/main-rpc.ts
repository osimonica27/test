import { AsyncCall } from 'async-call-rpc';

import type { HelperToMain, MainToHelper } from '../shared/type';
import { exposed } from './provide';
import { encodeToMp3 } from './recording/encode';

const helperToMainServer: HelperToMain = {
  getMeta: () => {
    if (!exposed) {
      throw new Error('Helper is not initialized correctly');
    }
    return exposed;
  },
  // allow main process encode audio samples to mp3 buffer (because it is slow and blocking)
  encodeToMp3,
};

export const mainRPC = AsyncCall<MainToHelper>(helperToMainServer, {
  strict: {
    unknownMessage: false,
  },
  channel: {
    on(listener) {
      const f = (e: Electron.MessageEvent) => {
        listener(e.data);
      };
      process.parentPort.on('message', f);
      return () => {
        process.parentPort.off('message', f);
      };
    },
    send(data) {
      process.parentPort.postMessage(data);
    },
  },
});
