import type { ExtensionType } from '@blocksuite/block-std';
import { createIdentifier } from '@blocksuite/global/di';

export interface ClipboardNativeService {
  copyAsImage(arrayBuffer: ArrayBuffer): Promise<void>;
}

export const ClipboardNativeProvider = createIdentifier<ClipboardNativeService>(
  'ClipboardNativeService'
);

export function ClipboardNativeExtension(
  clipboardNativeProvider: ClipboardNativeService
): ExtensionType {
  return {
    setup: di => {
      di.addImpl(ClipboardNativeProvider, clipboardNativeProvider);
    },
  };
}
