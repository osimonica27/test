import { type ParagraphData } from './types.js';

const meta = {
  emSize: 2048,
  hHeadAscent: 1984,
  hHeadDescent: -494,
};

class Bound {
  constructor(
    readonly left: number,
    readonly top: number,
    readonly width: number,
    readonly height: number
  ) {}

  add(x: number, y: number, w: number, h: number): Bound {
    return new Bound(
      this.left + x,
      this.top + y,
      this.width + w,
      this.height + h
    );
  }

  static fromClientRect(windowBound: Bound, clientRect: ClientRect): Bound {
    return new Bound(
      clientRect.left + windowBound.left,
      clientRect.top + windowBound.top,
      clientRect.width,
      clientRect.height
    );
  }

  static fromDOMRectList(windowBound: Bound, domRectList: DOMRectList): Bound {
    const domRect = Array.from(domRectList).find(rect => rect.width !== 0);
    return domRect
      ? new Bound(
          domRect.left + windowBound.left,
          domRect.top + windowBound.top,
          domRect.width,
          domRect.height
        )
      : Bound.EMPTY;
  }
  static EMPTY = new Bound(0, 0, 0, 0);
}

class TextBound {
  readonly text: string;
  readonly bound: Bound;

  constructor(text: string, bound: Bound) {
    this.text = text;
    this.bound = bound;
  }
}

function segmentWords(text: string): string[] {
  const segmenter = new Intl.Segmenter(void 0, {
    granularity: 'sentence',
  });
  return Array.from(segmenter.segment(text)).map(({ segment }) => segment);
}

async function loadFont() {
  const font = new FontFace(
    'IBM Plex Mono',
    `url(
  http://localhost:5173/node_modules/@toeverything/theme/fonts/inter/Inter-VariableFont_slnt,wght.ttf)`
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

function drawBound(
  ctx: OffscreenCanvasRenderingContext2D,
  textBound: TextBound,
  baselineY: number,
  baseY: number
) {
  const x = textBound.bound.left;
  const y = baselineY + baseY;

  ctx.fillText(textBound.text, x, y);
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

    paragraphs.forEach(({ rect, text }) => {
      const words = segmentWords(text);
      console.log(words);
      const x = rect.left - editorRect.left;
      const y = rect.top - editorRect.top;

      ctx.fillStyle = 'yellow';
      ctx.fillRect(x, y, rect.width, rect.height);

      ctx.fillStyle = 'black';
      ctx.font = '15px "Inter", sans-serif';
      const baselineY = getBaseline();

      const textBound = new TextBound(
        text,
        new Bound(x, y, rect.width, rect.height)
      );
      drawBound(ctx, textBound, baselineY, y);
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
