import { DebugLogger } from '@affine/debug';

import type {
  MessageData,
  MessageDataMap,
  MessageDataType,
} from '../workers/types';
import { MessageOp } from '../workers/types';

const logger = new DebugLogger('affine:workspace:pdf:channel');

export class PDFChannel {
  constructor(
    public readonly id: string,
    public readonly port: MessagePort
  ) {}

  on(callback: (data: MessageDataMap[MessageOp.Rendered]) => void) {
    this.port.addEventListener(
      'message',
      ({ data }: MessageEvent<MessageData>) => {
        const { type } = data;
        if (type !== MessageOp.Rendered) return;
        callback(data[type]);
      }
    );
    return this;
  }

  start() {
    this.port.start();
    logger.debug('opened', this.id);
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
      this.port.postMessage(message, transfers);
      return;
    }
    this.port.postMessage(message);
  }

  dispose() {
    this.post(MessageOp.ChannelClose, this.id);
    this.port.close();
    logger.debug('closed', this.id);
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
