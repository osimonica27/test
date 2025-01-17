import type { EditorHost } from '@blocksuite/block-std';

import { getSentenceRects, segmentSentences } from './text-utils.js';
import { type ParagraphLayout } from './types.js';

let worker: Worker | null = null;

function initWorker(width: number, height: number) {
  if (worker) {
    worker.terminate();
  }
  worker = new Worker(new URL('./canvas.worker.ts', import.meta.url), {
    type: 'module',
  });
  const dpr = window.devicePixelRatio;
  worker.postMessage({ type: 'init', data: { width, height, dpr } });
  return worker;
}

function getHostLayout(host: EditorHost) {
  const paragraphBlocks = host.querySelectorAll(
    '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
  );

  const paragraphs: ParagraphLayout[] = Array.from(paragraphBlocks).map(p => {
    const sentences = segmentSentences(p.textContent || '');
    const sentenceLayouts = sentences.map(sentence => {
      const rects = getSentenceRects(p, sentence);
      return {
        text: sentence,
        rects,
      };
    });
    return {
      sentences: sentenceLayouts,
    };
  });

  const hostRect = host.getBoundingClientRect();
  return { paragraphs, hostRect };
}

function toCanvas() {
  const host = document.querySelector('editor-host')!;
  const { paragraphs, hostRect } = getHostLayout(host);
  const worker = initWorker(hostRect.width, hostRect.height);

  worker.postMessage({
    type: 'draw',
    data: {
      paragraphs,
      hostRect,
    },
  });

  worker.onmessage = (e: MessageEvent) => {
    const { type, bitmap } = e.data;
    if (type === 'render') {
      const rightColumn = document.querySelector('#right-column')!;
      const existingCanvas = rightColumn.querySelector('canvas');
      if (existingCanvas) {
        existingCanvas.remove();
      }

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.width = hostRect.width * window.devicePixelRatio;
      canvas.height = hostRect.height * window.devicePixelRatio;
      rightColumn.append(canvas);

      const ctx = canvas.getContext('bitmaprenderer');
      ctx?.transferFromImageBitmap(bitmap);
    }
  };
}

export function initToCanvasSync() {
  const toCanvasButton = document.querySelector('#to-canvas-button')!;
  toCanvasButton.addEventListener('click', toCanvas);
}
