import type { Framework } from '@toeverything/infra';
import { WorkspaceScope, WorkspaceService } from '@toeverything/infra';

import { Pdf } from './entities/pdf';
import { Pdfs } from './entities/pdfs';
import { PdfsService } from './services/pdfs';

export function configurePDFModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(PdfsService)
    .entity(Pdfs, [WorkspaceService])
    .entity(Pdf);
}

export { Pdf } from './entities/pdf';
export { PdfsService } from './services/pdfs';
export { PdfClient, type PdfSender } from './workers/client';
