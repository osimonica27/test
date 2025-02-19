import { Module } from '@nestjs/common';

import { DocStorageModule } from '../doc';
import { PermissionModule } from '../permission';
import { DocRendererController } from './controller';
import { DocRendererJob } from './job';
import { DocContentService } from './service';

@Module({
  imports: [DocStorageModule, PermissionModule],
  providers: [DocContentService, DocRendererJob],
  controllers: [DocRendererController],
  exports: [DocContentService],
})
export class DocRendererModule {}

export { DocContentService };
