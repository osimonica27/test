import { exhaustMapWithTrailing } from '@toeverything/infra';
import { merge, Observable, of, Subject, throttleTime } from 'rxjs';

import type {
  AggregateOptions,
  AggregateResult,
  IndexerSchema,
  Query,
  SearchOptions,
  SearchResult,
} from '../../../storage';
import { IndexDocument, IndexerStorageBase } from '../../../storage';
import { IDBConnection, type IDBConnectionOptions } from '../db';
import { DataStruct } from './data-struct';
import { backoffRetry, fromPromise } from './utils';

export class IndexedDBIndexerStorage extends IndexerStorageBase {
  static readonly identifier = 'IndexedDBIndexStorage';
  readonly connection = new IDBConnection(this.options);
  override isReadonly = false;
  private readonly data = new DataStruct();
  private readonly tableUpdate$ = new Subject<string>();
  private readonly pendingUpdates = {
    doc: {
      inserts: [] as IndexDocument[],
      deletes: [] as string[],
      updates: [] as IndexDocument[],
    },
    block: {
      inserts: [] as IndexDocument[],
      deletes: [] as string[],
      updates: [] as IndexDocument[],
    },
  };

  get channel() {
    return this.connection.inner.channel;
  }

  get database() {
    return this.connection.inner.db;
  }

  constructor(private readonly options: IDBConnectionOptions) {
    super();
  }

  override async search<
    T extends keyof IndexerSchema,
    const O extends SearchOptions<T>,
  >(table: T, query: Query<T>, options?: O): Promise<SearchResult<T, O>> {
    const trx = await this.data.readonly(this.database);
    return this.data.search(trx, table, query, options);
  }
  override async aggregate<
    T extends keyof IndexerSchema,
    const O extends AggregateOptions<T>,
  >(
    table: T,
    query: Query<T>,
    field: keyof IndexerSchema[T],
    options?: O
  ): Promise<AggregateResult<T, O>> {
    const trx = await this.data.readonly(this.database);
    return this.data.aggregate(trx, table, query, field as string, options);
  }
  override search$<
    T extends keyof IndexerSchema,
    const O extends SearchOptions<T>,
  >(table: T, query: Query<T>, options?: O): Observable<SearchResult<T, O>> {
    return merge(of(1), this.watchTableUpdated(table)).pipe(
      throttleTime(3000, undefined, { leading: true, trailing: true }),
      exhaustMapWithTrailing(() => {
        return fromPromise(async () => {
          try {
            const trx = await this.data.readonly(this.database);
            return await this.data.search(trx, table, query, options);
          } catch (error) {
            console.error('search error', error);
            throw error;
          }
        }).pipe(backoffRetry());
      })
    );
  }
  override aggregate$<
    T extends keyof IndexerSchema,
    const O extends AggregateOptions<T>,
  >(
    table: T,
    query: Query<T>,
    field: keyof IndexerSchema[T],
    options?: O
  ): Observable<AggregateResult<T, O>> {
    return merge(of(1), this.watchTableUpdated(table)).pipe(
      throttleTime(3000, undefined, { leading: true, trailing: true }),
      exhaustMapWithTrailing(() => {
        return fromPromise(async () => {
          try {
            const trx = await this.data.readonly(this.database);
            return await this.data.aggregate(
              trx,
              table,
              query,
              field as string,
              options
            );
          } catch (error) {
            console.error('aggregate error', error);
            throw error;
          }
        }).pipe(backoffRetry());
      })
    );
  }

  override async deleteByQuery<T extends keyof IndexerSchema>(
    table: T,
    query: Query<T>
  ): Promise<void> {
    const trx = await this.data.readwrite(this.database);
    await this.data.deleteByQuery(trx, table, query);
  }

  override insert<T extends keyof IndexerSchema>(
    table: T,
    document: IndexDocument
  ): Promise<void> {
    this.pendingUpdates[table].inserts.push(document);
    return Promise.resolve();
  }

  override delete<T extends keyof IndexerSchema>(
    table: T,
    id: string
  ): Promise<void> {
    this.pendingUpdates[table].deletes.push(id);
    return Promise.resolve();
  }

  override update<T extends keyof IndexerSchema>(
    table: T,
    document: IndexDocument
  ): Promise<void> {
    this.pendingUpdates[table].updates.push(document);
    return Promise.resolve();
  }

  override async refresh<T extends keyof IndexerSchema>(
    table: T
  ): Promise<void> {
    const trx = await this.data.readwrite(this.database);
    await this.data.batchWrite(
      trx,
      table,
      this.pendingUpdates[table].deletes,
      this.pendingUpdates[table].inserts,
      this.pendingUpdates[table].updates
    );
    this.pendingUpdates[table].deletes = [];
    this.pendingUpdates[table].inserts = [];
    this.pendingUpdates[table].updates = [];
  }

  private watchTableUpdated(table: keyof IndexerSchema) {
    return new Observable(subscriber => {
      const listener = (ev: MessageEvent) => {
        if (ev.data.type === 'indexer-updated' && ev.data.table === table) {
          subscriber.next(1);
        }
      };

      const subscription = this.tableUpdate$.subscribe(table => {
        if (table === table) {
          subscriber.next(1);
        }
      });

      this.channel.addEventListener('message', listener);
      return () => {
        this.channel.removeEventListener('message', listener);
        subscription.unsubscribe();
      };
    });
  }

  emitTableUpdated(table: keyof IndexerSchema) {
    this.tableUpdate$.next(table);
    this.channel.postMessage({
      type: 'indexer-updated',
      table,
    });
  }
}
