import { Module } from '@nestjs/common';
import { CopilotModule } from './copilot.module';
import { EmbeddingModule } from './embedding/module';

@Module({
  imports: [CopilotModule, EmbeddingModule],
  exports: [CopilotModule, EmbeddingModule],
})
export class CopilotFeatureModule {}

export * from './copilot.module';
export * from './copilot.service';
export * from './embedding/module';
export * from './embedding/service';
