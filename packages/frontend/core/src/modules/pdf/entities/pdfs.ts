import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import type { WorkspaceService } from '@toeverything/infra';
import { Entity, ObjectPool } from '@toeverything/infra';

import { Pdf } from './pdf';

export class Pdfs extends Entity {
  pdfs = new ObjectPool<string, Pdf>({
    onDelete: pdf => {
      pdf.dispose();
    },
  });

  constructor(private readonly workspaceService: WorkspaceService) {
    super();
  }

  get(model: AttachmentBlockModel) {
    const { id } = model;

    let result = this.pdfs.get(id);

    if (!result) {
      const pdf = this.framework.createEntity(Pdf, { id });
      result = this.pdfs.put(id, pdf);
    }

    const { obj: pdf, release } = result;

    return { pdf, release };
  }

  get name() {
    return this.workspaceService.workspace.id;
  }

  override dispose() {
    this.pdfs.clear();
    super.dispose();
  }
}
