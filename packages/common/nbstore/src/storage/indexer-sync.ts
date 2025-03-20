import type { Connection } from '../connection';
import type { DocClock } from './doc';
import type { Storage } from './storage';

export interface IndexerSyncStorage extends Storage {
  readonly storageType: 'indexSync';

  getDocIndexedClock(docId: string): Promise<DocClock | null>;

  setDocIndexedClock(docClock: DocClock): Promise<void>;
}

export abstract class IndexerSyncStorageBase implements IndexerSyncStorage {
  readonly storageType = 'indexSync';
  abstract connection: Connection<any>;
  abstract getDocIndexedClock(docId: string): Promise<DocClock | null>;
  abstract setDocIndexedClock(docClock: DocClock): Promise<void>;
}
