import type { OpSchema } from '@toeverything/infra/op';

import type { DocState, RenderKind, RenderOut } from './types';

export interface ClientOps extends OpSchema {
  // Ping-Pong
  pingpong: [{ id: string }, DocState];
  // Opens a PDF document
  open: [{ id: string; buffer: ArrayBuffer }, DocState];
  // Creates a channel
  channel: [{ id: string; port: MessagePort }, boolean];
}

export interface ChannelOps extends OpSchema {
  // Renders image data by page index
  render: [
    {
      seq: number[];
      kind: RenderKind;
      scale?: number;
    },
    RenderOut | void,
  ];
}
