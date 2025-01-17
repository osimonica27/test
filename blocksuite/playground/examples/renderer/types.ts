export interface ParagraphLayout {
  sentences: {
    text: string;
    rects: TextRect[];
  }[];
}

export interface TextRect {
  rect: DOMRect;
  text: string;
}
