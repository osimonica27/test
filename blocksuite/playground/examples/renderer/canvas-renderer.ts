import type { EditorHost } from '@blocksuite/block-std';
import type { AffineEditorContainer } from '@blocksuite/presets';

import { getSentenceRects, segmentSentences } from './text-utils.js';
import { type ParagraphLayout } from './types.js';

export class CanvasRenderer {
  private worker: Worker | null = null;
  private readonly editorContainer: AffineEditorContainer;
  private readonly host: EditorHost;
  private readonly targetContainer: HTMLElement;
  private readonly canvas: HTMLCanvasElement = document.createElement('canvas');

  constructor(
    editorContainer: AffineEditorContainer,
    targetContainer: HTMLElement
  ) {
    this.editorContainer = editorContainer;
    this.host = editorContainer.host!;
    this.targetContainer = targetContainer;
  }

  private initWorker(width: number, height: number) {
    if (this.worker) {
      this.worker.terminate();
    }

    this.worker = new Worker(new URL('./canvas.worker.ts', import.meta.url), {
      type: 'module',
    });

    const dpr = window.devicePixelRatio;
    this.worker.postMessage({ type: 'init', data: { width, height, dpr } });
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
    const editorContainerRect = this.editorContainer.getBoundingClientRect();
    return { paragraphs, hostRect, editorContainerRect };
  }

  public async render(): Promise<void> {
    const { paragraphs, hostRect, editorContainerRect } = this.getHostLayout();
    this.initWorker(hostRect.width, hostRect.height);

    return new Promise(resolve => {
      if (!this.worker) return;

      this.worker.postMessage({
        type: 'draw',
        data: {
          paragraphs,
          hostRect,
        },
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, bitmap } = e.data;
        if (type === 'render') {
          this.canvas.style.width = editorContainerRect.width + 'px';
          this.canvas.style.height = editorContainerRect.height + 'px';
          this.canvas.width =
            editorContainerRect.width * window.devicePixelRatio;
          this.canvas.height =
            editorContainerRect.height * window.devicePixelRatio;

          if (!this.targetContainer.querySelector('canvas')) {
            this.targetContainer.append(this.canvas);
          }

          const ctx = this.canvas.getContext('2d');
          const bitmapCanvas = new OffscreenCanvas(
            hostRect.width * window.devicePixelRatio,
            hostRect.height * window.devicePixelRatio
          );
          const bitmapCtx = bitmapCanvas.getContext('bitmaprenderer');
          bitmapCtx?.transferFromImageBitmap(bitmap);

          ctx?.drawImage(
            bitmapCanvas,
            (hostRect.x - editorContainerRect.x) * window.devicePixelRatio,
            (hostRect.y - editorContainerRect.y) * window.devicePixelRatio,
            hostRect.width * window.devicePixelRatio,
            hostRect.height * window.devicePixelRatio
          );

          resolve();
        }
      };
    });
  }

  public destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
