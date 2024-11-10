import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { fromPromise, ObjectPool } from '@toeverything/infra';
import { OpClient, transfer } from '@toeverything/infra/op';
import { nanoid } from 'nanoid';
import { Observable, type Observer } from 'rxjs';

import type { ChannelOps, ClientOps } from './ops';
import { type DocState, State } from './types';
import { downloadBlobToBuffer } from './utils';

export function createPdfClient() {
  const worker = new Worker(
    /* webpackChunkName: "pdf.worker" */ new URL('./worker.ts', import.meta.url)
  );

  const client = new PdfClient(worker);
  client.listen();
  return client;
}

export type PdfSender = OpClient<ChannelOps>;

export class PdfClient extends OpClient<ClientOps> {
  channels = new ObjectPool<string, PdfSender>({
    onDelete(client) {
      client.destroy();
    },
  });

  private _ping(id: string, subscriber: Observer<DocState>) {
    return this.subscribe('pingpong', { id }, subscriber);
  }

  private _open(
    id: string,
    buffer: ArrayBuffer,
    subscriber: Observer<DocState>
  ) {
    return this.subscribe(
      'open',
      transfer({ id, buffer }, [buffer]),
      subscriber
    );
  }

  private _downloadBlobToBuffer(
    model: AttachmentBlockModel,
    subscriber: Partial<Observer<ArrayBuffer>>
  ) {
    return fromPromise(downloadBlobToBuffer(model)).subscribe(subscriber);
  }

  // Opens a PDF document.
  open(model: AttachmentBlockModel, update?: (info: DocState) => void) {
    const { id } = model;
    const ob$ = new Observable<DocState>(subscriber => {
      const setInfo = (info: DocState) => {
        update?.(info);
        subscriber.next(info);
      };
      const error = (err?: any) => subscriber.error(err);
      const complete = () => subscriber.complete();

      this._ping(id, {
        next: info => {
          setInfo(info);

          if (info.state === State.Opened) {
            complete();
            return;
          }

          if (info.state === State.Opening) {
            return;
          }

          if (info.state === State.Loaded) {
            info.state = State.Opening;
            setInfo(info);

            this._downloadBlobToBuffer(model, {
              next: buffer =>
                this._open(id, buffer, {
                  next: info => setInfo(info),
                  error,
                  complete,
                }),
              error: err => subscriber.error(err),
            });
          }
        },
        error,
        complete,
      });
    });

    return ob$;
  }

  // Creates a channel.
  channel(id = nanoid()) {
    let result = this.channels.get(id);

    if (!result) {
      const { port1, port2: port } = new MessageChannel();
      const sender = new OpClient(port1);

      this.call('channel', transfer({ id, port }, [port])).catch(err => {
        console.error(err);
      });

      result = this.channels.put(id, sender);

      sender.listen();
    }

    const { obj: sender, release } = result;

    return { sender, release };
  }

  override destroy() {
    this.channels.clear();
    super.destroy();
  }

  [Symbol.dispose]() {
    this.destroy();
  }
}
