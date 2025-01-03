import type { IpcMainInvokeEvent } from 'electron';
import { clipboard, nativeImage } from 'electron';

import type { NamespaceHandlers } from '../type';

export const clipboardHandlers = {
  copyAsImage: async (_: IpcMainInvokeEvent, arrayBuffer: ArrayBuffer) => {
    const image = nativeImage.createFromBuffer(Buffer.from(arrayBuffer));
    if (image.isEmpty()) return;
    clipboard.writeImage(image);
  },
} satisfies NamespaceHandlers;
