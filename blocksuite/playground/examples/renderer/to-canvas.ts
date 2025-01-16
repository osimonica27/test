import { type ParagraphData } from './types.js';

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

export function initToCanvasSync() {
  const toCanvasButton = document.querySelector('#to-canvas-button')!;
  toCanvasButton.addEventListener('click', () => {
    const editorHost = document.querySelector('editor-host')!;
    const rect = editorHost.getBoundingClientRect();
    const { width, height } = rect;

    const rightColumn = document.querySelector('#right-column')!;

    const worker = initWorker(width, height);
    const paragraphs = editorHost.querySelectorAll('affine-paragraph');
    const editorRect = editorHost.getBoundingClientRect();

    const paragraphData: ParagraphData[] = Array.from(paragraphs).map(p => {
      const rect = p.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(p);
      return {
        rect,
        text: p.textContent || '',
        style: {
          fontSize: computedStyle.fontSize,
          fontFamily: computedStyle.fontFamily,
          lineHeight: computedStyle.lineHeight,
        },
      };
    });
    worker.postMessage({
      type: 'draw',
      data: {
        paragraphs: paragraphData,
        editorRect,
      },
    });

    worker.onmessage = (e: MessageEvent) => {
      const { type, bitmap } = e.data;
      if (type === 'render') {
        const existingCanvas = rightColumn.querySelector('canvas');
        if (existingCanvas) {
          existingCanvas.remove();
        }

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        rightColumn.append(canvas);

        const ctx = canvas.getContext('bitmaprenderer');
        ctx?.transferFromImageBitmap(bitmap);
      }
    };
  });
}
