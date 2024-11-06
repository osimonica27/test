import { Service } from '@toeverything/infra';

import { PDFEntity } from '../entities/pdf';

export class PDFService extends Service {
  pdf = this.framework.createEntity(PDFEntity);

  get(id: string) {
    return this.pdf.get(id);
  }

  override dispose(): void {
    this.pdf.dispose();
    super.dispose();
  }
}
