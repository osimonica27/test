import { type SectionLayout, type ViewportState } from './types.js';

type WorkerMessageInit = {
  type: 'init';
  data: {
    width: number;
    height: number;
    dpr: number;
    viewport: ViewportState;
  };
};

type WorkerMessageDraw = {
  type: 'draw';
  data: {
    section: SectionLayout;
  };
};

type WorkerMessage = WorkerMessageInit | WorkerMessageDraw;

const meta = {
  emSize: 2048,
  hHeadAscent: 1984,
  hHeadDescent: -494,
};

const font = new FontFace(
  'Inter',
  `url(https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ8UA3.woff2)`
);
// @ts-expect-error worker env
self.fonts && self.fonts.add(font);
font.load().catch(console.error);

function getBaseline() {
  const fontSize = 15;
  const lineHeight = 1.2 * fontSize;

  const A = fontSize * (meta.hHeadAscent / meta.emSize); // ascent
  const D = fontSize * (meta.hHeadDescent / meta.emSize); // descent
  const AD = A + Math.abs(D); // ascent + descent
  const L = lineHeight - AD; // leading
  const y = A + L / 2;
  return y;
}

class CanvasWorkerManager {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private viewport: ViewportState | null = null;

  init(width: number, height: number, dpr: number, viewport: ViewportState) {
    this.canvas = new OffscreenCanvas(width * dpr, height * dpr);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = 'lightgrey';
    this.ctx.fillRect(0, 0, width, height);
    this.viewport = viewport;
  }

  toViewCoord(modelX: number, modelY: number): [number, number] {
    if (!this.viewport) return [modelX, modelY];
    const { viewportX, viewportY, zoom, viewScale } = this.viewport;
    return [
      (modelX - viewportX) * zoom * viewScale,
      (modelY - viewportY) * zoom * viewScale,
    ];
  }

  draw(section: SectionLayout) {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;

    // Track rendered positions to avoid duplicate rendering across all paragraphs and sentences
    const renderedPositions = new Set<string>();

    section.paragraphs.forEach(paragraph => {
      const zoom = paragraph.zoom ?? 1;
      const fontSize = 15 * zoom;
      ctx.font = `${fontSize}px Inter`;
      const baselineY = getBaseline() * zoom;

      paragraph.sentences.forEach(sentence => {
        ctx.strokeStyle = 'yellow';
        sentence.rects.forEach(textRect => {
          const x = textRect.rect.x - section.rect.x;
          const y = textRect.rect.y - section.rect.y;

          const posKey = `${x},${y}`;
          // Only render if we haven't rendered at this position before
          if (renderedPositions.has(posKey)) return;

          ctx.strokeRect(x, y, textRect.rect.w, textRect.rect.h);
          ctx.fillStyle = 'black';
          ctx.fillText(textRect.text, x, y + baselineY);

          renderedPositions.add(posKey);
        });
      });
    });

    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ type: 'render', bitmap }, { transfer: [bitmap] });
  }
}

const manager = new CanvasWorkerManager();

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;
  switch (type) {
    case 'init': {
      const { width, height, dpr, viewport } = data;
      manager.init(width, height, dpr, viewport);
      break;
    }
    case 'draw': {
      await font.load();
      const { section } = data;
      manager.draw(section);
      break;
    }
  }
};
