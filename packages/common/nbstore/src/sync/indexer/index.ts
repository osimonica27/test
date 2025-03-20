import { MANUALLY_STOP } from '@toeverything/infra';

import type { DocStorage, IndexerStorage } from '../../storage';
import { throwIfAborted } from '../../utils/throw-if-aborted';
import { crawlingDocData, crawlingRootDocData } from './crawler';

export class IndexSyncImpl {
  private abort: AbortController | null = null;

  readonly interval = () =>
    new Promise<void>(resolve =>
      requestIdleCallback(() => resolve(), {
        timeout: 200,
      })
    );

  constructor(
    readonly local: DocStorage,
    readonly index: IndexerStorage
  ) {}

  start() {
    if (this.abort) {
      this.abort.abort(MANUALLY_STOP);
    }

    const abort = new AbortController();
    this.abort = abort;

    this.mainLoop(abort.signal).catch(error => {
      if (error === MANUALLY_STOP) {
        return;
      }
      console.error('index error', error);
    });
  }

  stop() {
    this.abort?.abort(MANUALLY_STOP);
    this.abort = null;
  }

  async fullIndex() {
    const docClocks = await this.local.getDocTimestamps();
    for (const docId in docClocks) {
      if (docId.startsWith('db$') || docId.startsWith('userdata$')) {
        return;
      }
      await this.index.enqueueIndexJob({
        docId,
      });
    }
  }

  private async mainLoop(signal?: AbortSignal) {
    if (this.index.isReadonly) {
      return;
    }

    await Promise.race([
      Promise.all([
        this.local.connection.waitForConnected(signal),
        this.index.connection.waitForConnected(signal),
      ]),
      new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connect to remote timeout'));
        }, 1000 * 30);
      }),
      new Promise((_, reject) => {
        signal?.addEventListener('abort', reason => {
          reject(reason);
        });
      }),
    ]);

    const dispose = this.local.subscribeDocUpdate(update => {
      // skip db docs
      if (
        update.docId.startsWith('db$') ||
        update.docId.startsWith('userdata$')
      ) {
        return;
      }
      this.index
        .enqueueIndexJob({
          docId: update.docId,
        })
        .catch(error => {
          console.error(error);
        });
    });

    try {
      while (throwIfAborted(signal)) {
        const job = await this.index.acceptIndexJob(signal);

        try {
          if (job.docId === this.local.spaceId) {
            const allIndexedDocs = await this.index.allIds('doc');
            const rootDocBuffer = (await this.local.getDoc(this.local.spaceId))
              ?.bin;
            if (rootDocBuffer) {
              const { allDocs, deleted } = crawlingRootDocData({
                allIndexedDocs,
                rootDocBuffer,
              });
              await this.index.write('doc', {
                upserts: allDocs,
                deletes: deleted,
              });
            }
          } else {
            const docBuffer = (await this.local.getDoc(job.docId))?.bin;
            if (docBuffer) {
              const { block: blockDocuments, preview } = await crawlingDocData({
                docBuffer,
                docId: job.docId,
                rootDocId: this.local.spaceId,
              });
              await this.index.deleteByQuery('block', {
                type: 'match',
                field: 'docId',
                match: job.docId,
              });
              if (preview) {
                await this.index.write('docPreview', {
                  upserts: [preview],
                });
              }
              await this.index.write('block', {
                upserts: blockDocuments,
              });
            }
          }
        } catch (err) {
          console.error(
            'Error processing index jobs',
            err instanceof Error ? (err.stack ?? err.message) : err
          );
        } finally {
          await this.index.completeIndexJob(job);
        }

        await this.interval();
      }
    } finally {
      dispose();
    }
  }
}
