export enum State {
  IDLE = 0,
  Loading,
  Loaded, // WASM has been loaded and initialized.
  Opening,
  Opened, // A document has been opened.
}

export type DocInfo = {
  total: number;
  width: number;
  height: number;
};

export enum RenderKind {
  Page,
  Thumbnail,
}

export type RenderOut = {
  index: number;
  width: number;
  height: number;
  kind: RenderKind;
  buffer: Uint8ClampedArray;
};

export type DocState = { state: State } & DocInfo;

export function defaultDocInfo(total = 1, width = 1, height = 1) {
  return { total, width, height };
}
