import { DummyConnection } from '../../connection';
import type { DocClock } from '../doc';
import { IndexerSyncStorageBase } from '../indexer-sync';

export class DummyIndexerSyncStorage extends IndexerSyncStorageBase {
  override connection = new DummyConnection();
  override getDocIndexedClock(docId: string): Promise<DocClock | null> {
    return Promise.resolve(null);
  }
  override setDocIndexedClock(docClock: DocClock): Promise<void> {
    return Promise.resolve();
  }
}
