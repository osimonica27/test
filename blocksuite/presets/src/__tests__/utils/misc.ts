import { replaceIdMiddleware } from '@blocksuite/blocks';
import { type DocSnapshot, Job, type Workspace } from '@blocksuite/store';

export async function importFromSnapshot(
  collection: Workspace,
  snapshot: DocSnapshot
) {
  const job = new Job({
    collection,
    middlewares: [replaceIdMiddleware],
  });

  return job.snapshotToDoc(snapshot);
}
