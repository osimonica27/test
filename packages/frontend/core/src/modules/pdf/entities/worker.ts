import { DebugLogger } from '@affine/debug';
import { LiveData } from '@toeverything/infra';
import { nanoid } from 'nanoid';

import type { MessageData, MessageDataType } from '../workers/types';
import { MessageOp, State } from '../workers/types';
import { PDFChannel } from './channel';

const logger = new DebugLogger('affine:workspace:pdf:worker');

export class PDFWorker {
  public readonly worker: Worker;

  public docInfo$ = new LiveData({ total: 0, width: 1, height: 1 });

  constructor(
    public readonly id: string,
    public readonly name: string
  ) {
    const worker = new Worker(
      /* webpackChunkName: "pdf.worker" */ new URL(
        '../workers/worker.ts',
        import.meta.url
      )
    );

    worker.addEventListener('message', (e: MessageEvent) => {
      this.process(e).catch(console.error);
    });

    this.worker = worker;
    logger.debug('created');
  }

  async process({ data }: MessageEvent<MessageData>) {
    const { type } = data;

    // @ts-expect-error allow
    if (type === State.Loaded) {
      this.worker.dispatchEvent(new CustomEvent('ready'));
      return;
    }

    if (type === MessageOp.Opened) {
      this.docInfo$.value = data[type];
      this.worker.dispatchEvent(new CustomEvent('opened'));
      return;
    }

    if (type === MessageOp.Rendered) {
      this.worker.dispatchEvent(
        new CustomEvent('rendered', {
          detail: data[type],
        })
      );
    }
  }

  on(listeners: Record<string, (e: Event) => void>) {
    const disposables: Disposable[] = [];

    for (const [type, listener] of Object.entries(listeners)) {
      this.worker.addEventListener(type, listener);

      disposables.push({
        [Symbol.dispose]: () => {
          this.worker.removeEventListener(type, listener);
        },
      });
    }
    return {
      [Symbol.dispose]: () => {
        disposables.forEach(disposable => disposable[Symbol.dispose]());
      },
    };
  }

  // Creates a channel.
  channel(id = nanoid()) {
    const { port1, port2 } = new MessageChannel();
    this.post(MessageOp.ChannelOpen, id, [port2]);
    return new PDFChannel(id, port1);
  }

  open(buffer: ArrayBuffer) {
    this.post(MessageOp.Open, buffer, [buffer]);
  }

  post<T extends MessageOp>(
    type: T,
    data?: MessageDataType[T],
    transfers?: Transferable[]
  ) {
    const message = { type };
    if (data) {
      Object.assign(message, { [type]: data });
    }
    if (transfers?.length) {
      this.worker.postMessage(message, transfers);
      return;
    }
    this.worker.postMessage(message);
  }

  dispose() {
    this.worker.terminate();
    logger.debug('closed');
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
