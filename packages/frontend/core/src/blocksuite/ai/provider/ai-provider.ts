import type { Slot, SlotMap } from '@blocksuite/affine/global/utils';

import type { CopilotClient } from './copilot-client';

export type InsertTemplateOptions = {
  /**
   * Template file path
   */
  template: string;
  /**
   * mode, page/edgeless
   */
  mode: string;
};

class AIProviderClass {
  constructor() {
    //
  }

  public copilotClient: CopilotClient | null = null;

  public readonly slots = {
    /**
     * Request to insert template
     */
    requestInsertTemplate: new Slot<InsertTemplateOptions>(),
    /**
     * Request to upgrade plan
     */
    requestUpgradePlan: new Slot<void>(),
  } as const satisfies SlotMap;

  public getCopilotClient(): CopilotClient | null {
    return this.copilotClient;
  }

  public setCopilotClient(client: CopilotClient): void {
    this.copilotClient = client;
  }
}

export const AIProvider = new AIProviderClass();

// This is needed for Graphql codegen
export type InsertTemplateOptionsFork = InsertTemplateOptions;
