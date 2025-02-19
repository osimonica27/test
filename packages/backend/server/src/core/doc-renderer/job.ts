import { Injectable } from '@nestjs/common';

import { OnJob } from '../../base';
import { DocContentService } from './service';

declare global {
  interface Jobs {
    'doc.markDocContentCacheStale': {
      workspaceId: string;
      docId: string;
    };
  }
}

@Injectable()
export class DocRendererJob {
  constructor(private readonly doc: DocContentService) {}

  @OnJob('doc.markDocContentCacheStale')
  async mergePendingDocUpdates({
    workspaceId,
    docId,
  }: Jobs['doc.markDocContentCacheStale']) {
    await this.doc.markDocContentCacheStale(workspaceId, docId);
  }
}
