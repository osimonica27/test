import {
  BlockFlavourIdentifier,
  LifeCycleWatcher,
} from '@blocksuite/affine/block-std';
import {
  EdgelessElementToolbarWidget,
  EdgelessRootBlockSpec,
} from '@blocksuite/affine/blocks/root';
import { ToolbarModuleExtension } from '@blocksuite/affine/shared/services';
import type { ExtensionType } from '@blocksuite/affine/store';
import type { FrameworkProvider } from '@toeverything/infra';

import { buildAIPanelConfig } from '../ai-panel';
import { toolbarAIEntryConfig } from '../entries';
import {
  setupEdgelessCopilot,
  setupEdgelessElementToolbarAIEntry,
} from '../entries/edgeless/index';
import { setupSpaceAIEntry } from '../entries/space/setup-space';
import { CopilotTool } from '../tool/copilot-tool';
import {
  AffineAIPanelWidget,
  aiPanelWidget,
} from '../widgets/ai-panel/ai-panel';
import {
  EdgelessCopilotWidget,
  edgelessCopilotWidget,
} from '../widgets/edgeless-copilot';
import { AiSlashMenuConfigExtension } from './ai-slash-menu';

export function createAIEdgelessRootBlockSpec(
  framework: FrameworkProvider
): ExtensionType[] {
  return [
    ...EdgelessRootBlockSpec,
    CopilotTool,
    aiPanelWidget,
    edgelessCopilotWidget,
    getAIEdgelessRootWatcher(framework),
    ToolbarModuleExtension({
      id: BlockFlavourIdentifier('custom:affine:note'),
      config: toolbarAIEntryConfig(),
    }),
    AiSlashMenuConfigExtension(),
  ];
}

function getAIEdgelessRootWatcher(framework: FrameworkProvider) {
  class AIEdgelessRootWatcher extends LifeCycleWatcher {
    static override key = 'ai-edgeless-root-watcher';

    override mounted() {
      super.mounted();
      const { view } = this.std;
      view.viewUpdated.on(payload => {
        if (payload.type !== 'widget' || payload.method !== 'add') {
          return;
        }
        const component = payload.view;
        if (component instanceof AffineAIPanelWidget) {
          component.style.width = '430px';
          component.config = buildAIPanelConfig(component, framework);
          setupSpaceAIEntry(component);
        }

        if (component instanceof EdgelessCopilotWidget) {
          setupEdgelessCopilot(component);
        }

        if (component instanceof EdgelessElementToolbarWidget) {
          setupEdgelessElementToolbarAIEntry(component);
        }
      });
    }
  }
  return AIEdgelessRootWatcher;
}
