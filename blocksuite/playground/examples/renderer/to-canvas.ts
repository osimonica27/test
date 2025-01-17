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

interface WordSegment {
  text: string;
  start: number;
  end: number;
}

function getWordSegments(text: string): WordSegment[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  return Array.from(segmenter.segment(text)).map(({ segment, index }) => ({
    text: segment,
    start: index,
    end: index + segment.length,
  }));
}

function getRangeRects(range: Range, fullText: string): TextRect[] {
  const rects = Array.from(range.getClientRects());
  const textRects: TextRect[] = [];

  if (rects.length === 0) return textRects;

  // If there's only one rect, use the full text
  if (rects.length === 1) {
    textRects.push({
      rect: rects[0],
      text: fullText,
    });
    return textRects;
  }

  const segments = getWordSegments(fullText);

  // Calculate the total width and average width per character
  const totalWidth = rects.reduce((sum, rect) => sum + rect.width, 0);
  const charWidthEstimate = totalWidth / fullText.length;

  let currentRect = 0;
  let currentSegments: WordSegment[] = [];
  let currentWidth = 0;

  segments.forEach(segment => {
    const segmentWidth = segment.text.length * charWidthEstimate;
    const isPunctuation = /^[.,!?;:]$/.test(segment.text.trim());

    // Handle punctuation: if the punctuation doesn't exceed the rect width, merge it with the previous segment
    if (isPunctuation && currentSegments.length > 0) {
      const withPunctuationWidth = currentWidth + segmentWidth;
      // Allow slight overflow (120%) since punctuation is usually very narrow
      if (withPunctuationWidth <= rects[currentRect]?.width * 1.2) {
        currentSegments.push(segment);
        currentWidth = withPunctuationWidth;
        return;
      }
    }

    if (
      currentWidth + segmentWidth > rects[currentRect]?.width &&
      currentSegments.length > 0 &&
      !isPunctuation // If it's punctuation, try merging with the previous word first
    ) {
      textRects.push({
        rect: rects[currentRect],
        text: currentSegments.map(seg => seg.text).join(''),
      });

      currentRect++;
      currentSegments = [segment];
      currentWidth = segmentWidth;
    } else {
      currentSegments.push(segment);
      currentWidth += segmentWidth;
    }
  });

  // Handle remaining segments if any
  if (currentSegments.length > 0 && currentRect < rects.length) {
    textRects.push({
      rect: rects[currentRect],
      text: currentSegments.map(seg => seg.text).join(''),
    });
  }

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
