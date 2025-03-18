import type { Connection } from '../connection';

export type StorageType =
  | 'blob'
  | 'blobSync'
  | 'doc'
  | 'docSync'
  | 'awareness'
  | 'index'
  | 'indexSync';

export interface Storage {
  readonly storageType: StorageType;
  readonly connection: Connection;
}
