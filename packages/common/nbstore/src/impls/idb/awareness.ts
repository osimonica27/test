import { share } from '../../connection';
import {
  type AwarenessRecord,
  AwarenessStorage,
} from '../../storage/awareness';
import { IDBConnection } from './db';

export class IndexedDBAwarenessStorage extends AwarenessStorage {
  override readonly storageType = 'awareness';
  override readonly connection = share(new IDBConnection(this.options));

  private readonly subscriptions = new Map<
    string,
    Set<(update: AwarenessRecord, origin?: string) => void>
  >();

  private readonly cached = new Map<string, AwarenessRecord>();

  override update(record: AwarenessRecord, origin?: string): Promise<void> {
    const subscribers = this.subscriptions.get(record.docId);
    if (subscribers) {
      subscribers.forEach(callback => callback(record, origin));
    }
    this.cached.set(record.docId, record);
    return Promise.resolve();
  }

  override subscribeUpdate(
    id: string,
    callback: (update: AwarenessRecord, origin?: string) => void
  ): () => void {
    const subscribers = this.subscriptions.get(id) ?? new Set();
    subscribers.add(callback);
    this.subscriptions.set(id, subscribers);
    const cached = this.cached.get(id);
    if (cached) {
      callback(cached);
    }
    return () => {
      subscribers.delete(callback);
    };
  }
}
