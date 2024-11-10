import { OpConsumer, transfer } from '@toeverything/infra/op';
import type { Document } from '@toeverything/pdf-viewer';
import {
  createPDFium,
  PageRenderingflags,
  Runtime,
  Viewer,
} from '@toeverything/pdf-viewer';
import { BehaviorSubject, filter, from, map, switchMap, take } from 'rxjs';

import type { ChannelOps, ClientOps } from './ops';
import type { DocInfo } from './types';
import { defaultDocInfo, State } from './types';
import { renderToUint8ClampedArray } from './utils';

let viewer: Viewer | null = null;
let doc: Document | undefined = undefined;
const info: DocInfo = defaultDocInfo();
const state$ = new BehaviorSubject(State.IDLE);
const FLAGS = PageRenderingflags.REVERSE_BYTE_ORDER | PageRenderingflags.ANNOT;

// Pipes
const statePipe$ = state$.pipe(map(state => ({ state, ...info })));

state$.next(State.Loading);

createPDFium()
  .then(pdfium => {
    viewer = new Viewer(new Runtime(pdfium));
    state$.next(State.Loaded);
  })
  .catch(err => {
    state$.error(err);
  });

// Multiple channels can be processed in a worker.

// @ts-expect-error fixme
const consumer = new OpConsumer<ClientOps>(self);

consumer.register('pingpong', () => {
  return statePipe$;
});

consumer.register('open', ({ id: _, buffer }) => {
  if (!viewer) {
    return statePipe$;
  }

  return state$
    .pipe(
      take(1),
      filter(s => s === State.Loaded)
    )
    .pipe(
      switchMap(() => {
        if (doc) {
          doc?.close();
        }

        state$.next(State.Opening);

        doc = viewer?.open(new Uint8Array(buffer));

        if (!doc) {
          Object.assign(info, defaultDocInfo());
          state$.next(State.Loaded);
          return statePipe$;
        }

        const page = doc.page(0);
        if (!page) {
          doc.close();
          Object.assign(info, defaultDocInfo());
          state$.next(State.Loaded);
          return statePipe$;
        }

        const rect = page.size();
        page.close();

        const total = doc.pageCount();

        Object.assign(info, { total, ...rect });
        state$.next(State.Opened);
        return statePipe$;
      })
    );
});

consumer.register('channel', ({ id: _, port }) => {
  const receiver = new OpConsumer<ChannelOps>(port);

  receiver.register('render', ({ seq, kind, scale = 1 }) => {
    if (!viewer || !doc) return from([]).pipe();

    const width = Math.ceil(info.width * scale);
    const height = Math.ceil(info.height * scale);

    return from(seq).pipe(
      map(index => {
        if (!viewer || !doc) return;

        const buffer = renderToUint8ClampedArray(
          viewer,
          doc,
          FLAGS,
          index,
          width,
          height
        );
        if (!buffer) return;

        return transfer({ index, kind, width, height, buffer }, [
          buffer.buffer,
        ]);
      })
    );
  });

  receiver.listen();
  return true;
});

consumer.listen();
