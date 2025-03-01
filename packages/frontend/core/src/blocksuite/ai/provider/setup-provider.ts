import type { GlobalDialogService } from '@affine/core/modules/dialogs';

import { AIProvider } from './ai-provider';
import type { CopilotClient } from './copilot-client';

export function setupAIProvider(
  client: CopilotClient,
  globalDialogService: GlobalDialogService
) {
  // Register the client with the provider
  AIProvider.setCopilotClient(client);

  const disposable = client.onError(error => {
    console.error('Copilot error:', error);
    if (error.type === 'auth') {
      error.code === 2003
        ? globalDialogService.open('over-capacity', {})
        : globalDialogService.open('over-capacity-hard', {});
    }

    if (error.code === 2001 || error.code === 2002) {
      AIProvider.slots.requestUpgradePlan.emit();
    }
  });
  return () => {
    disposable.dispose();
    // Clear the reference when disposed
    AIProvider.setCopilotClient(null);
  };
}
