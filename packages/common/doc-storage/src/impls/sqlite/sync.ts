import type { OpHandler } from '../../op';
import {
  type DocClocks,
  SyncStorage,
  type SyncStorageOptions,
} from '../../storage';
import type {
  GetPeerClocksOp,
  GetPeerPushedClocksOp,
  SetPeerClockOp,
  SetPeerPushedClockOp,
} from '../../storage/ops';
import type { NativeDocStorage } from './db';

export interface SqliteSyncStorageOptions extends SyncStorageOptions {
  db: NativeDocStorage;
}

export class SqliteDBSyncStorage extends SyncStorage<SqliteSyncStorageOptions> {
  get db() {
    return this.options.db;
  }

  override getPeerClocks: OpHandler<GetPeerClocksOp> = async ({ peer }) => {
    const records = await this.db.getPeerClocks(peer);
    return records.reduce((clocks, { docId, timestamp }) => {
      clocks[docId] = timestamp;
      return clocks;
    }, {} as DocClocks);
  };

  override setPeerClock: OpHandler<SetPeerClockOp> = async ({
    peer,
    docId,
    timestamp,
  }) => {
    await this.db.setPeerClock(peer, docId, timestamp);
  };

  override getPeerPushedClocks: OpHandler<GetPeerPushedClocksOp> = async ({
    peer,
  }) => {
    const records = await this.db.getPeerPushedClocks(peer);
    return records.reduce((clocks, { docId, timestamp }) => {
      clocks[docId] = timestamp;
      return clocks;
    }, {} as DocClocks);
  };

  override setPeerPushedClock: OpHandler<SetPeerPushedClockOp> = async ({
    peer,
    docId,
    timestamp,
  }) => {
    await this.db.setPeerPushedClock(peer, docId, timestamp);
  };
}
