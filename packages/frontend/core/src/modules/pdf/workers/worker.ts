import type { Document } from '@toeverything/pdf-viewer';
import {
  createPDFium,
  PageRenderingflags,
  Runtime,
  Viewer,
} from '@toeverything/pdf-viewer';

import type { MessageData, MessageDataType } from './types';
import { MessageOp, State } from './types';
import { renderToImageData } from './utils';

let state = State.IDLE;
let viewer: Viewer | null = null;
let doc: Document | undefined = undefined;
const docInfo = { total: 0, width: 1, height: 1 };
const flags = PageRenderingflags.REVERSE_BYTE_ORDER | PageRenderingflags.ANNOT;
const channels = new Set<MessagePort>();

// Waits for wasm to load and initialize.
async function start() {
  if (state !== State.IDLE) return;

  waitForReady({ id: 0 });

  state = State.Loading;

  const pdfium = await createPDFium();
  viewer = new Viewer(new Runtime(pdfium));

  state = State.Loaded;
}

function post<T extends keyof MessageDataType>(
  sender: typeof globalThis | MessagePort,
  type: T,
  data?: MessageDataType[T],
  transfers?: Transferable[]
) {
  const message = { type };
  if (data) {
    Object.assign(message, { [type]: data });
  }
  if (transfers?.length) {
    if (sender instanceof MessagePort) {
      sender.postMessage(message, transfers);
      return;
    }
    sender.postMessage(message, '*', transfers);
    return;
  }
  sender.postMessage(message);
}

function waitForReady(tick: { id: number }) {
  post(self, state);
  if (state === State.Loaded || state === State.Failed) {
    if (tick.id) {
      clearTimeout(tick.id);
      tick.id = 0;
    }
    return;
  }
  // @ts-expect-error allow
  tick.id = setTimeout(waitForReady, 55, tick);
}

function rendering(
  sender: typeof globalThis | MessagePort,
  viewer: Viewer,
  doc: Document,
  data: MessageDataType[MessageOp.Render]
) {
  const { index, kind, scale = 1 } = data;

  if (index < 0 || index >= docInfo.total) return;

  const width = Math.ceil(docInfo.width * scale);
  const height = Math.ceil(docInfo.height * scale);
  const imageData = renderToImageData(viewer, doc, flags, index, width, height);
  if (!imageData) return;

  post(sender, MessageOp.Rendered, { index, kind, imageData });
}

function process({ data, ports: [port] }: MessageEvent<MessageData>) {
  const { type } = data;

  switch (type) {
    case MessageOp.Open: {
      if (!viewer) return;

      const buffer = data[type];
      if (!buffer) return;

      // release loaded document
      if (doc) {
        doc.close();
      }

      doc = viewer.open(new Uint8Array(buffer));

      if (!doc) return;

      const page = doc.page(0);

      if (!page) return;

      Object.assign(docInfo, {
        total: doc.pageCount(),
        height: Math.ceil(page.height()),
        width: Math.ceil(page.width()),
      });
      page.close();

      post(self, MessageOp.Opened, docInfo);

      break;
    }

    case MessageOp.Render: {
      if (!viewer || !doc) return;

      rendering(self, viewer, doc, data[type]);

      break;
    }

    // process only images
    case MessageOp.ChannelOpen: {
      const id = data[type];
      if (id && port) {
        port.addEventListener(
          'message',
          ({ data }: MessageEvent<MessageData>) => {
            const { type } = data;

            if (type === MessageOp.ChannelClose) {
              port.close();
              channels.delete(port);
              return;
            }

            if (!viewer || !doc) return;

            if (type !== MessageOp.Render) return;

            rendering(port, viewer, doc, data[type]);
          }
        );
        port.start();
      }

      break;
    }
  }
}

self.addEventListener('message', process);

start().catch(err => {
  if (channels.size > 0) {
    for (const channel of channels) {
      channel.close();
    }
    channels.clear();
  }
  if (doc) {
    doc.close();
    doc = undefined;
  }
  if (viewer) {
    viewer.close();
    viewer = null;
  }
  console.error(err);
});
