import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import type { AffineEditorContainer } from '@blocksuite/presets';

import { getSentenceRects, segmentSentences } from './text-utils.js';
import {
  type ParagraphLayout,
  type Rect,
  type SectionLayout,
  type ViewportState,
} from './types.js';

export class CanvasRenderer {
  private readonly worker: Worker;
  private readonly editorContainer: AffineEditorContainer;
  private readonly targetContainer: HTMLElement;
  public readonly canvas: HTMLCanvasElement = document.createElement('canvas');

  constructor(
    editorContainer: AffineEditorContainer,
    targetContainer: HTMLElement
  ) {
    this.editorContainer = editorContainer;
    this.targetContainer = targetContainer;

    this.worker = new Worker(new URL('./canvas.worker.ts', import.meta.url), {
      type: 'module',
    });
  }

  private initWorkerSize(width: number, height: number) {
    const dpr = window.devicePixelRatio;
    const viewport = this.editorContainer.std.get(
      GfxControllerIdentifier
    ).viewport;
    const viewportState: ViewportState = {
      zoom: viewport.zoom,
      viewScale: viewport.viewScale,
      viewportX: viewport.viewportX,
      viewportY: viewport.viewportY,
    };
    this.worker.postMessage({
      type: 'init',
      data: { width, height, dpr, viewport: viewportState },
    });
  }

  get hostRect() {
    return this.editorContainer.host!.getBoundingClientRect();
  }

  get hostZoom() {
    return this.editorContainer.std.get(GfxControllerIdentifier).viewport.zoom;
  }

  get hostLayout(): {
    section: SectionLayout;
    hostRect: DOMRect;
    editorContainerRect: DOMRect;
  } {
    const paragraphBlocks = this.editorContainer.host!.querySelectorAll(
      '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
    );

    const zoom = this.hostZoom;
    const hostRect = this.hostRect;
    const editorContainerRect = this.editorContainer.getBoundingClientRect();

    let sectionMinX = Infinity;
    let sectionMinY = Infinity;
    let sectionMaxX = -Infinity;
    let sectionMaxY = -Infinity;

    const paragraphs: ParagraphLayout[] = Array.from(paragraphBlocks).map(p => {
      const sentences = segmentSentences(p.textContent || '');
      const sentenceLayouts = sentences.map(sentence => {
        const rects = getSentenceRects(p, sentence);
        rects.forEach(({ rect }) => {
          sectionMinX = Math.min(sectionMinX, rect.x);
          sectionMinY = Math.min(sectionMinY, rect.y);
          sectionMaxX = Math.max(sectionMaxX, rect.x + rect.w);
          sectionMaxY = Math.max(sectionMaxY, rect.y + rect.h);
        });
        return {
          text: sentence,
          rects,
        };
      });

      return {
        sentences: sentenceLayouts,
        zoom,
      };
    });

    const section: SectionLayout = {
      paragraphs,
      rect: {
        x: sectionMinX,
        y: sectionMinY,
        w: sectionMaxX - sectionMinX,
        h: sectionMaxY - sectionMinY,
      },
    };

    return { section, hostRect, editorContainerRect };
  }

  public async render(toScreen = true): Promise<void> {
    const { section, editorContainerRect } = this.hostLayout;
    this.initWorkerSize(section.rect.w, section.rect.h);

    return new Promise(resolve => {
      if (!this.worker) return;

      this.worker.postMessage({
        type: 'draw',
        data: {
          section,
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
            section.rect.w * window.devicePixelRatio,
            section.rect.h * window.devicePixelRatio
          );
          const bitmapCtx = bitmapCanvas.getContext('bitmaprenderer');
          bitmapCtx?.transferFromImageBitmap(bitmap);

          if (!toScreen) {
            resolve();
            return;
          }

          ctx?.drawImage(
            bitmapCanvas,
            (section.rect.x - editorContainerRect.x) * window.devicePixelRatio,
            (section.rect.y - editorContainerRect.y) * window.devicePixelRatio,
            section.rect.w * window.devicePixelRatio,
            section.rect.h * window.devicePixelRatio
          );

          resolve();
        }
      };
    });
  }

  public renderTransitionFrame(
    beginSection: SectionLayout,
    endSection: SectionLayout,
    beginHostRect: Rect,
    endHostRect: Rect,
    progress: number
  ) {
    const editorContainerRect = this.editorContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    if (!this.targetContainer.querySelector('canvas')) {
      this.targetContainer.append(this.canvas);
    }

    const ctx = this.canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    const getParagraphRect = (paragraph: ParagraphLayout): Rect => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      paragraph.sentences.forEach(sentence => {
        sentence.rects.forEach(({ rect }) => {
          minX = Math.min(minX, rect.x);
          minY = Math.min(minY, rect.y);
          maxX = Math.max(maxX, rect.x + rect.w);
          maxY = Math.max(maxY, rect.y + rect.h);
        });
      });

      return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      };
    };

    // Helper function to interpolate between two rects
    const interpolateRect = (rect1: Rect, rect2: Rect, t: number): Rect => {
      return {
        x: rect1.x + (rect2.x - rect1.x) * t,
        y: rect1.y + (rect2.y - rect1.y) * t,
        w: rect1.w + (rect2.w - rect1.w) * t,
        h: rect1.h + (rect2.h - rect1.h) * t,
      };
    };

    // Draw host rect
    const currentHostRect = interpolateRect(
      beginHostRect,
      endHostRect,
      progress
    );
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      currentHostRect.x - editorContainerRect.x,
      currentHostRect.y - editorContainerRect.y,
      currentHostRect.w,
      currentHostRect.h
    );

    // Draw paragraph rects
    const maxParagraphs = Math.max(
      beginSection.paragraphs.length,
      endSection.paragraphs.length
    );

    for (let i = 0; i < maxParagraphs; i++) {
      const beginRect =
        i < beginSection.paragraphs.length
          ? getParagraphRect(beginSection.paragraphs[i])
          : getParagraphRect(
              endSection.paragraphs[endSection.paragraphs.length - 1]
            );
      const endRect =
        i < endSection.paragraphs.length
          ? getParagraphRect(endSection.paragraphs[i])
          : getParagraphRect(
              beginSection.paragraphs[beginSection.paragraphs.length - 1]
            );

      const currentRect = interpolateRect(beginRect, endRect, progress);
      ctx.fillStyle = '#efefef';
      ctx.fillRect(
        currentRect.x - editorContainerRect.x,
        currentRect.y - editorContainerRect.y,
        currentRect.w,
        currentRect.h
      );
    }

    ctx.scale(1 / dpr, 1 / dpr);
  }

  public destroy() {
    this.worker.terminate();
  }
}
