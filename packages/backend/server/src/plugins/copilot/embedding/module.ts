import { Module } from '@nestjs/common';
import { EmbeddingService } from './service';
import { EmbeddingResolver } from './resolver';
import { EmbeddingEventListener } from './listener';
import { CopilotModule } from '../copilot.module';

@Module({
  imports: [CopilotModule],
  providers: [EmbeddingService, EmbeddingResolver, EmbeddingEventListener],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
