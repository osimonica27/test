import { Module } from '@nestjs/common';
import { Plugin } from '../registry';
import { CopilotFeatureModule } from './';

@Plugin({
  name: 'copilot',
  isActive: config => config.plugins?.copilot?.enabled !== false,
})
@Module({
  imports: [CopilotFeatureModule],
  exports: [CopilotFeatureModule],
})
export class CopilotPlugin {}
