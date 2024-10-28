import type { OpHandler } from '../../op';
import {
  BlobStorage,
  type BlobStorageOptions,
  type ListedBlobRecord,
} from '../../storage';
import type {
  DeleteBlobOp,
  GetBlobOp,
  ListBlobsOp,
  ReleaseBlobsOp,
  SetBlobOp,
} from '../../storage/ops';
import { type SpaceIDB } from './db';

export interface IndexedDBBlobStorageOptions extends BlobStorageOptions {
  db: SpaceIDB;
}

export class IndexedDBBlobStorage extends BlobStorage<IndexedDBBlobStorageOptions> {
  get db() {
    return this.options.db;
  }

  protected override doConnect(): Promise<void> {
    return Promise.resolve();
  }
  protected override doDisconnect(): Promise<void> {
    return Promise.resolve();
  }

  override get: OpHandler<GetBlobOp> = async ({ key }) => {
    const trx = this.db.transaction(['blobs', 'blobData'], 'readonly');
    const blob = await trx.objectStore('blobs').get(key);
    const data = await trx.objectStore('blobData').get(key);

    if (!blob || blob.deletedAt || !data) {
      return null;
    }

    return {
      ...blob,
      data: data.data,
    };
  };

  override set: OpHandler<SetBlobOp> = async blob => {
    const trx = this.db.transaction(['blobs', 'blobData'], 'readwrite');
    await trx.objectStore('blobs').put({
      key: blob.key,
      mime: blob.mime,
      size: blob.data.byteLength,
      createdAt: new Date(),
      deletedAt: null,
    });
    await trx.objectStore('blobData').put({
      key: blob.key,
      data: blob.data,
    });
  };

  override delete: OpHandler<DeleteBlobOp> = async ({ key, permanently }) => {
    if (permanently) {
      const trx = this.db.transaction(['blobs', 'blobData'], 'readwrite');
      await trx.objectStore('blobs').delete(key);
      await trx.objectStore('blobData').delete(key);
    } else {
      const trx = this.db.transaction('blobs', 'readwrite');
      const blob = await trx.store.get(key);
      if (blob) {
        await trx.store.put({
          ...blob,
          deletedAt: new Date(),
        });
      }
    }
  };

  override release: OpHandler<ReleaseBlobsOp> = async () => {
    const trx = this.db.transaction(['blobs', 'blobData'], 'readwrite');

    const it = trx.objectStore('blobs').iterate();

    for await (const item of it) {
      if (item.value.deletedAt) {
        await item.delete();
        await trx.objectStore('blobData').delete(item.value.key);
      }
    }
  };

  override list: OpHandler<ListBlobsOp> = async () => {
    const trx = this.db.transaction('blobs', 'readonly');
    const it = trx.store.iterate();

    const blobs: ListedBlobRecord[] = [];
    for await (const item of it) {
      if (!item.value.deletedAt) {
        blobs.push(item.value);
      }
    }

    return blobs;
  };
}
