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
import type { SpaceIDB } from './db';

export interface IndexedDBSyncStorageOptions extends SyncStorageOptions {
  db: SpaceIDB;
}

export class IndexedDBSyncStorage extends SyncStorage<IndexedDBSyncStorageOptions> {
  get db() {
    return this.options.db;
  }

  override getPeerClocks: OpHandler<GetPeerClocksOp> = async ({ peer }) => {
    const trx = this.db.transaction('peerClocks', 'readonly');

    const records = await trx.store.index('peer').getAll(peer);

    return records.reduce((clocks, { docId, clock }) => {
      clocks[docId] = clock;
      return clocks;
    }, {} as DocClocks);
  };

  override setPeerClock: OpHandler<SetPeerClockOp> = async ({
    peer,
    docId,
    timestamp,
  }) => {
    const trx = this.db.transaction('peerClocks', 'readwrite');
    const record = await trx.store.get([peer, docId]);

    if (!record || record.clock < timestamp) {
      await trx.store.put({
        peer,
        docId,
        clock: timestamp,
        pushedClock: record?.pushedClock ?? new Date(0),
      });
    }
  };

  override getPeerPushedClocks: OpHandler<GetPeerPushedClocksOp> = async ({
    peer,
  }) => {
    const trx = this.db.transaction('peerClocks', 'readonly');

    const records = await trx.store.index('peer').getAll(peer);

    return records.reduce((clocks, { docId, pushedClock }) => {
      clocks[docId] = pushedClock;
      return clocks;
    }, {} as DocClocks);
  };

  override setPeerPushedClock: OpHandler<SetPeerPushedClockOp> = async ({
    peer,
    docId,
    timestamp,
  }) => {
    const trx = this.db.transaction('peerClocks', 'readwrite');
    const record = await trx.store.get([peer, docId]);

    if (!record || record.pushedClock < timestamp) {
      await trx.store.put({
        peer,
        docId,
        clock: record?.clock ?? new Date(0),
        pushedClock: timestamp,
      });
    }
  };
}
