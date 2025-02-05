export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SentenceLayout {
  text: string;
  rects: TextRect[];
}

export interface ParagraphLayout {
  sentences: SentenceLayout[];
  scale: number;
}

export interface TextRect {
  rect: Rect;
  text: string;
}

export interface SectionLayout {
  paragraphs: ParagraphLayout[];
  rect: Rect;
}
