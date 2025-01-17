export interface ParagraphData {
  sentences: {
    text: string;
    rects: TextRect[];
  }[];
}

export interface TextRect {
  rect: DOMRect;
  text: string;
}
