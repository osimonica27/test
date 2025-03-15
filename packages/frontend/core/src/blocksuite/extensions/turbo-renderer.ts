import { ParagraphLayoutHandlerExtension } from '@blocksuite/affine/blocks/paragraph';
import {
  TurboRendererConfigFactory,
  ViewportTurboRendererExtension,
} from '@blocksuite/affine/gfx/turbo-renderer';

function createPainterWorker() {
  const worker = new Worker(
    /* webpackChunkName: "turbo-painter-entry" */ new URL(
      './turbo-painter-entry.worker.ts',
      import.meta.url
    ),
    {
      type: 'module',
    }
  );
  return worker;
}

export function patchTurboRendererExtension() {
  return [
    ParagraphLayoutHandlerExtension,
    TurboRendererConfigFactory({
      options: {
        zoomThreshold: 1,
        debounceTime: 1000,
      },
      painterWorkerEntry: createPainterWorker,
    }),
    ViewportTurboRendererExtension,
  ];
}
