import { getSentenceRects, segmentSentences } from './text-utils.js';
import type { ParagraphLayout, ViewportLayout } from './types.js';

export function syncCanvasSize(canvas: HTMLCanvasElement, host: HTMLElement) {
  const hostRect = host.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  canvas.style.position = 'absolute';
  canvas.style.left = '0px';
  canvas.style.top = '0px';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.width = hostRect.width * dpr;
  canvas.height = hostRect.height * dpr;
  canvas.style.pointerEvents = 'none';
}

export function getViewportLayout(
  host: HTMLElement,
  viewport: Viewport
): ViewportLayout {
  const paragraphBlocks = host.querySelectorAll(
    '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
  );

  const zoom = viewport.zoom;

  let layoutMinX = Infinity;
  let layoutMinY = Infinity;
  let layoutMaxX = -Infinity;
  let layoutMaxY = -Infinity;

  const paragraphs: ParagraphLayout[] = Array.from(paragraphBlocks).map(p => {
    const sentences = segmentSentences(p.textContent || '');
    const sentenceLayouts = sentences.map(sentence => {
      const rects = getSentenceRects(p, sentence);
      rects.forEach(({ rect }) => {
        layoutMinX = Math.min(layoutMinX, rect.x);
        layoutMinY = Math.min(layoutMinY, rect.y);
        layoutMaxX = Math.max(layoutMaxX, rect.x + rect.w);
        layoutMaxY = Math.max(layoutMaxY, rect.y + rect.h);
      });
      return {
        text: sentence,
        rects: rects.map(rect => {
          const [x, y] = viewport.toModelCoordFromClientCoord([
            rect.rect.x,
            rect.rect.y,
          ]);
          return {
            ...rect,
            rect: {
              x,
              y,
              w: rect.rect.w / zoom / viewport.viewScale,
              h: rect.rect.h / zoom / viewport.viewScale,
            },
          };
        }),
      };
    });

    return {
      sentences: sentenceLayouts,
      zoom,
    };
  });

  const layoutModelCoord = viewport.toModelCoordFromClientCoord([
    layoutMinX,
    layoutMinY,
  ]);
  const w = (layoutMaxX - layoutMinX) / zoom / viewport.viewScale;
  const h = (layoutMaxY - layoutMinY) / zoom / viewport.viewScale;
  const layout: ViewportLayout = {
    paragraphs,
    rect: {
      x: layoutModelCoord[0],
      y: layoutModelCoord[1],
      w: Math.max(w, 0),
      h: Math.max(h, 0),
    },
  };
  return layout;
}
