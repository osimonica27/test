import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { Entity, LiveData } from '@toeverything/infra';

import { createPdfClient } from '../workers/client';
import { defaultDocInfo, type DocState, State } from '../workers/types';

export class Pdf extends Entity<{ id: string }> {
  public readonly id: string = this.props.id;

  public readonly info$ = new LiveData<DocState>({
    state: State.IDLE,
    ...defaultDocInfo(),
  });

  public readonly client = createPdfClient();

  open(model: AttachmentBlockModel) {
    return this.client.open(model, info => this.info$.next(info));
  }

  override dispose() {
    this.client.destroy();
    super.dispose();
  }
}
