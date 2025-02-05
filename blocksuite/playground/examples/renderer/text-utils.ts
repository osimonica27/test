import type { TextRect } from './types';

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
    const rect = rects[0];
    textRects.push({
      rect: {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
      },
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
      const rect = rects[currentRect];
      textRects.push({
        rect: {
          x: rect.x,
          y: rect.y,
          w: rect.width,
          h: rect.height,
        },
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
    const rect = rects[currentRect];
    textRects.push({
      rect: {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
      },
      text: currentSegments.map(seg => seg.text).join(''),
    });
  }

  return textRects;
}

export function getSentenceRects(
  element: Element,
  sentence: string
): TextRect[] {
  const textNode = Array.from(element.childNodes).find(
    node => node.nodeType === Node.TEXT_NODE
  );

  if (!textNode) return [];

  const text = textNode.textContent || '';
  let rects: TextRect[] = [];
  let startIndex = 0;

  // Find all occurrences of the sentence
  while ((startIndex = text.indexOf(sentence, startIndex)) !== -1) {
    const range = document.createRange();
    range.setStart(textNode, startIndex);
    range.setEnd(textNode, startIndex + sentence.length);

    rects = rects.concat(getRangeRects(range, sentence));
    startIndex += sentence.length; // Move to next potential occurrence
  }

  return rects;
}

export function segmentSentences(text: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
  return Array.from(segmenter.segment(text)).map(({ segment }) => segment);
}
