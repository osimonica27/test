import type { DocStorage as NativeDocStorage } from '@affine/native';

import type { OpHandler } from '../../op';
import {
  type DocClocks,
  type DocRecord,
  DocStorage,
  type DocStorageOptions,
  type GetDocSnapshotOp,
} from '../../storage';
import type {
  DeleteDocOp,
  GetDocTimestampsOp,
  PushDocUpdateOp,
} from '../../storage/ops';

interface SqliteDocStorageOptions extends DocStorageOptions {
  db: NativeDocStorage;
}

export class SqliteDocStorage extends DocStorage<SqliteDocStorageOptions> {
  get name() {
    return 'sqlite';
  }

  get db() {
    return this.options.db;
  }

  protected override doConnect(): Promise<void> {
    return Promise.resolve();
  }

  protected override doDisconnect(): Promise<void> {
    return Promise.resolve();
  }

  override pushDocUpdate: OpHandler<PushDocUpdateOp> = async ({
    docId,
    bin,
  }) => {
    const timestamp = await this.db.pushUpdate(docId, bin);

    return { docId, timestamp };
  };

  override deleteDoc: OpHandler<DeleteDocOp> = async ({ docId }) => {
    await this.db.deleteDoc(docId);
  };

  override getDocTimestamps: OpHandler<GetDocTimestampsOp> = async ({
    after,
  }) => {
    const clocks = await this.db.getDocClocks(
      after ? new Date(after) : undefined
    );

    return clocks.reduce((ret, cur) => {
      ret[cur.docId] = cur.timestamp;
      return ret;
    }, {} as DocClocks);
  };

  protected override getDocSnapshot: OpHandler<GetDocSnapshotOp> = async ({
    docId,
  }) => {
    const snapshot = await this.db.getDocSnapshot(docId);

    if (!snapshot) {
      return null;
    }

    return {
      docId,
      bin: snapshot.data,
      timestamp: snapshot.timestamp,
    };
  };

  protected override setDocSnapshot(snapshot: DocRecord): Promise<boolean> {
    return this.db.setDocSnapshot({
      docId: snapshot.docId,
      data: Buffer.from(snapshot.bin),
      timestamp: new Date(snapshot.timestamp),
    });
  }

  protected override async getDocUpdates(docId: string) {
    return this.db.getDocUpdates(docId).then(updates =>
      updates.map(update => ({
        docId,
        bin: update.data,
        timestamp: update.createdAt,
      }))
    );
  }

  protected override markUpdatesMerged(docId: string, updates: DocRecord[]) {
    return this.db.markUpdatesMerged(
      docId,
      updates.map(update => update.timestamp)
    );
  }
}
