import type { BlobRecord, BlobStorage } from '../storage';
import { SingletonLocker } from '../storage/lock';
import type { BlobSync } from '../sync/blob';

export class BlobFrontend {
  // Since 'set' and 'get' operations may be called in rapid succession, we use a lock mechanism
  // to ensure that 'get' requests for the same blob are paused when a 'set' operation is in progress.
  private readonly lock = new SingletonLocker();
  constructor(
    readonly storage: BlobStorage,
    private readonly sync: BlobSync
  ) {}

  get state$() {
    return this.sync.state$;
  }

  async get(blobId: string) {
    await using lock = await this.lock.lock('blob', blobId);
    const local = await this.storage.get(blobId);
    if (local) {
      return local;
    }
    await lock[Symbol.asyncDispose]();

    await this.sync.downloadBlob(blobId);
    return await this.storage.get(blobId);
  }

  async set(blob: BlobRecord) {
    if (blob.data.byteLength > this.maxBlobSize) {
      for (const cb of this.onReachedMaxBlobSizeCallbacks) {
        cb(blob.data.byteLength);
      }
      throw new Error('Blob size exceeds the maximum limit');
    }
    await using lock = await this.lock.lock('blob', blob.key);
    await this.storage.set(blob);
    await lock[Symbol.asyncDispose]();

    // We don't wait for the upload to complete,
    // as the upload process runs asynchronously in the background
    this.sync.uploadBlob(blob).catch(err => {
      // never reach here
      console.error(err);
    });

    return;
  }

  fullDownload(peerId?: string, signal?: AbortSignal) {
    return this.sync.fullDownload(peerId, signal);
  }

  private maxBlobSize = 1024 * 1024 * 100; // 100MB
  private readonly onReachedMaxBlobSizeCallbacks: Set<
    (byteSize: number) => void
  > = new Set();

  setMaxBlobSize(max: number) {
    this.maxBlobSize = max;
  }

  onReachedMaxBlobSize(cb: (byteSize: number) => void): () => void {
    this.onReachedMaxBlobSizeCallbacks.add(cb);
    return () => this.onReachedMaxBlobSizeCallbacks.delete(cb);
  }
}
