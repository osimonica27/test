import type { WorkspaceService } from '@toeverything/infra';
import { Entity, ObjectPool } from '@toeverything/infra';

import { PDFWorker } from './worker';

export class PDFEntity extends Entity {
  workers = new ObjectPool<string, PDFWorker>({
    onDelete(worker) {
      worker.dispose();
    },
  });

  constructor(private readonly workspaceService: WorkspaceService) {
    super();
  }

  get(id: string) {
    let result = this.workers.get(id);
    if (!result) {
      const worker = new PDFWorker(id, this.name);
      result = this.workers.put(id, worker);
    }
    return { worker: result.obj, release: result.release };
  }

  get name() {
    return this.workspaceService.workspace.id;
  }

  override dispose(): void {
    for (const worker of this.workers.objects.values()) {
      worker.obj.dispose();
    }
    this.workers.clear();
    super.dispose();
  }
}
