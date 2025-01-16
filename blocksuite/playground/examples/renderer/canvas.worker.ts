import { type ParagraphData } from './types.js';

function segmentWords(text: string): string[] {
  const segmenter = new Intl.Segmenter(void 0, {
    granularity: 'word',
  });
  return Array.from(segmenter.segment(text)).map(({ segment }) => segment);
}

class CanvasWorkerManager {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;

  init(width: number, height: number, dpr: number) {
    this.canvas = new OffscreenCanvas(width * dpr, height * dpr);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = 'lightgrey';
    this.ctx.fillRect(0, 0, width, height);
  }

  draw(paragraphs: ParagraphData[], editorRect: DOMRect) {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;

    ctx.fillStyle = 'yellow';
    paragraphs.forEach(({ rect, text }) => {
      const words = segmentWords(text);
      console.log(words);
      const x = rect.left - editorRect.left;
      const y = rect.top - editorRect.top;
      ctx.fillRect(x, y, rect.width, rect.height);
    });

    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ type: 'render', bitmap }, { transfer: [bitmap] });
  }
}

const manager = new CanvasWorkerManager();

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;
  switch (type) {
    case 'init': {
      const { width, height, dpr } = data;
      manager.init(width, height, dpr);
      break;
    }

    case 'draw': {
      const { paragraphs, editorRect } = data;
      manager.draw(paragraphs, editorRect);
      break;
    }
  }
};
