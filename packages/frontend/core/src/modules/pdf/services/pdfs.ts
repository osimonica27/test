import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { Service } from '@toeverything/infra';

import { Pdfs } from '../entities/pdfs';

// One PDF document one worker.
// Multiple channels correspond to multiple views.

export class PdfsService extends Service {
  pdfs = this.framework.createEntity(Pdfs);

  get(model: AttachmentBlockModel) {
    return this.pdfs.get(model);
  }

  override dispose() {
    this.pdfs.dispose();
    super.dispose();
  }
}
