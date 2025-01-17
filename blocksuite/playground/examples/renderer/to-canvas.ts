import type { EditorHost } from '@blocksuite/block-std';

import { type ParagraphData, type TextRect } from './types.js';

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

function segmentSentences(text: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
  return Array.from(segmenter.segment(text)).map(({ segment }) => segment);
}

function getRangeRects(range: Range, fullText: string): TextRect[] {
  const rects = range.getClientRects();
  const textRects: TextRect[] = [];

  let lastRight = -1;
  let currentText = '';
  let charIndex = 0;

  Array.from(rects).forEach((rect, i) => {
    // if this rect and the previous one are not contiguous in the horizontal direction,
    // it means a line break
    if (rect.left <= lastRight && currentText) {
      textRects.push({
        rect: rects[i - 1],
        text: currentText,
      });
      currentText = '';
    }

    // estimate the character count of this rect based on width ratio
    const rectWidth = rect.width;
    const avgCharWidth = rect.width / fullText.length;
    const charsInRect = Math.round(rectWidth / avgCharWidth);

    currentText = fullText.substr(charIndex, charsInRect);
    charIndex += charsInRect;

    if (i === rects.length - 1 && currentText) {
      textRects.push({
        rect,
        text: currentText,
      });
    }

    lastRight = rect.right;
  });

  return textRects;
}

function getSentenceRects(element: Element, sentence: string): TextRect[] {
  const range = document.createRange();
  const textNode = Array.from(element.childNodes).find(
    node => node.nodeType === Node.TEXT_NODE
  );

  if (!textNode) return [];

  const text = textNode.textContent || '';
  const startIndex = text.indexOf(sentence);
  if (startIndex === -1) return [];

  range.setStart(textNode, startIndex);
  range.setEnd(textNode, startIndex + sentence.length);

  return getRangeRects(range, sentence);
}

function getWorkerData(editorHost: EditorHost) {
  const paragraphBlocks = editorHost.querySelectorAll(
    '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
  );

  const paragraphs: ParagraphData[] = Array.from(paragraphBlocks).map(p => {
    const sentences = segmentSentences(p.textContent || '');
    const sentencesData = sentences.map(sentence => {
      const rects = getSentenceRects(p, sentence);
      return {
        text: sentence,
        rects,
      };
    });
    return {
      sentences: sentencesData,
    };
  });

  const editorRect = editorHost.getBoundingClientRect();
  return { paragraphs, editorRect };
}

function toCanvas() {
  const editorHost = document.querySelector('editor-host')!;
  const { paragraphs, editorRect } = getWorkerData(editorHost);
  const { width, height } = editorRect;
  const worker = initWorker(width, height);

  worker.postMessage({
    type: 'draw',
    data: {
      paragraphs,
      editorRect,
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
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
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
