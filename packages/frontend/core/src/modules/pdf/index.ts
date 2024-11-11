import type { Framework } from '@toeverything/infra';
import { WorkspaceScope } from '@toeverything/infra';

import { PDF, PDFPage } from './entities/pdf';
import { PDFService } from './services/pdf';

export function configurePDFModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(PDFService)
    .entity(PDF)
    .entity(PDFPage);
}

export { PDF, type PDFRendererState, PDFStatus } from './entities/pdf';
export { PDFRenderer } from './renderer';
export { PDFService } from './services/pdf';
