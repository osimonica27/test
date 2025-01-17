import type { EditorHost } from '@blocksuite/block-std';

import { getSentenceRects, segmentSentences } from './text-utils.js';
import { type ParagraphLayout } from './types.js';

export class CanvasRenderer {
  private worker: Worker | null = null;
  private readonly host: EditorHost;
  private readonly targetContainer: HTMLElement;

  constructor(host: EditorHost, targetContainer: HTMLElement) {
    this.host = host;
    this.targetContainer = targetContainer;
  }

  private initWorker(width: number, height: number): Worker {
    if (this.worker) {
      this.worker.terminate();
    }

    this.worker = new Worker(new URL('./canvas.worker.ts', import.meta.url), {
      type: 'module',
    });

    const dpr = window.devicePixelRatio;
    this.worker.postMessage({ type: 'init', data: { width, height, dpr } });
    return this.worker;
  }

  private getHostLayout() {
    const paragraphBlocks = this.host.querySelectorAll(
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

    const hostRect = this.host.getBoundingClientRect();
    return { paragraphs, hostRect };
  }

  public render() {
    const { paragraphs, hostRect } = this.getHostLayout();
    const worker = this.initWorker(hostRect.width, hostRect.height);

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
        const existingCanvas = this.targetContainer.querySelector('canvas');
        if (existingCanvas) {
          existingCanvas.remove();
        }

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = hostRect.width * window.devicePixelRatio;
        canvas.height = hostRect.height * window.devicePixelRatio;
        this.targetContainer.append(canvas);

        const ctx = canvas.getContext('bitmaprenderer');
        ctx?.transferFromImageBitmap(bitmap);
      }
    };
  }

  public destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
