import { type ParagraphLayout } from './types.js';

const meta = {
  emSize: 2048,
  hHeadAscent: 1984,
  hHeadDescent: -494,
};

async function loadFont() {
  const font = new FontFace(
    'Inter',
    `url(https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ8UA3.woff2)`
  );
  // @ts-expect-error worker env
  self.fonts && self.fonts.add(font);
  await font.load();
}

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

  init(width: number, height: number, dpr: number) {
    this.canvas = new OffscreenCanvas(width * dpr, height * dpr);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = 'lightgrey';
    this.ctx.fillRect(0, 0, width, height);
  }

  draw(paragraphs: ParagraphLayout[], editorRect: DOMRect) {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;

    ctx.font = '15px Inter';
    const baselineY = getBaseline();

    paragraphs.forEach(paragraph => {
      paragraph.sentences.forEach(sentence => {
        ctx.strokeStyle = 'yellow';
        sentence.rects.forEach(textRect => {
          const x = textRect.rect.left - editorRect.left;
          const y = textRect.rect.top - editorRect.top;
          ctx.strokeRect(x, y, textRect.rect.width, textRect.rect.height);
        });

        ctx.fillStyle = 'black';
        sentence.rects.forEach(textRect => {
          const x = textRect.rect.left - editorRect.left;
          const y = textRect.rect.top - editorRect.top;
          ctx.fillText(textRect.text, x, y + baselineY);
        });
      });
    });

    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ type: 'render', bitmap }, { transfer: [bitmap] });
  }
}

const manager = new CanvasWorkerManager();

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;
  switch (type) {
    case 'init': {
      const { width, height, dpr } = data;
      manager.init(width, height, dpr);
      break;
    }
    case 'draw': {
      await loadFont();
      const { paragraphs, editorRect } = data;
      manager.draw(paragraphs, editorRect);
      break;
    }
  }
};
