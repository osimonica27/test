export enum State {
  IDLE = 0,
  Loading,
  Loaded,
  Failed,
}

export type DocInfo = {
  total: number;
  width: number;
  height: number;
};

export type ViewportInfo = {
  // TODO(@fundon): zoom & scale
  dpi: number;
  width: number;
  height: number;
};

export enum MessageOp {
  Open = State.Failed + 1,
  Opened,
  Render,
  Rendered,
  ChannelOpen,
  ChannelClose,
}

export enum RenderKind {
  Page,
  Thumbnail,
}

export interface MessageDataMap {
  [State.IDLE]: undefined;
  [State.Loading]: undefined;
  [State.Loaded]: undefined;
  [State.Failed]: undefined;
  [MessageOp.Open]: ArrayBuffer;
  [MessageOp.Opened]: DocInfo;
  [MessageOp.Render]: {
    index: number;
    kind: RenderKind;
    scale?: number;
  };
  [MessageOp.Rendered]: {
    index: number;
    width: number;
    height: number;
    kind: RenderKind;
    buffer: Uint8ClampedArray;
  };
  [MessageOp.ChannelOpen]: string;
  [MessageOp.ChannelClose]: string;
}

export type MessageDataType<T = MessageDataMap> = {
  [P in keyof T]: T[P];
};

export type MessageData<T = MessageOp, P = MessageDataType> = {
  type: T;
} & P;
