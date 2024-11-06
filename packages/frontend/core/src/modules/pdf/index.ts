import type { Framework } from '@toeverything/infra';
import { WorkspaceScope, WorkspaceService } from '@toeverything/infra';

import { PDFEntity } from './entities/pdf';
import { PDFService } from './services/pdf';

export function configurePDFModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(PDFService)
    .entity(PDFEntity, [WorkspaceService]);
}

export { PDFChannel } from './entities/channel';
export { PDFWorker } from './entities/worker';
export { PDFService } from './services/pdf';
