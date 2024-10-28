import type { DocStorage as NativeDocStorage } from '@affine/native';

import type { OpHandler } from '../../op';
import { BlobStorage, type BlobStorageOptions } from '../../storage';
import type {
  DeleteBlobOp,
  GetBlobOp,
  ListBlobsOp,
  ReleaseBlobsOp,
  SetBlobOp,
} from '../../storage/ops';

interface SqliteBlobStorageOptions extends BlobStorageOptions {
  db: NativeDocStorage;
}

export class SqliteBlobStorage extends BlobStorage<SqliteBlobStorageOptions> {
  get db() {
    return this.options.db;
  }

  override get: OpHandler<GetBlobOp> = async ({ key }) => {
    return this.db.getBlob(key);
  };

  override set: OpHandler<SetBlobOp> = async blob => {
    await this.db.setBlob(blob);
  };

  override delete: OpHandler<DeleteBlobOp> = async ({ key, permanently }) => {
    await this.db.deleteBlob(key, permanently);
  };

  override release: OpHandler<ReleaseBlobsOp> = async () => {
    await this.db.releaseBlobs();
  };

  override list: OpHandler<ListBlobsOp> = async () => {
    return this.db.listBlobs();
  };
}
