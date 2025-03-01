import { VBlock } from '@blocksuite/affine/models';
import type { Page, Workspace } from '@blocksuite/affine/store';
import {
  BlocksContextInjector,
  CopilotRequestBuilder,
  CopilotResponseParser,
  createContextRegistry,
  generateCompletionsFromServer,
  AIMessageTypes,
  NetworkUnavailableError,
  prepareAICompletionFromVNodes,
  DefaultAIBlockTokenCounter,
} from '@blocksuite/affine/blocks';
import { nanoid } from 'nanoid';

import type { GlobalDialogService } from '@affine/core/modules/dialogs';
import { AIProvider, setupAIProvider, extendCopilotClient } from '.';
import { CopilotTextBuilder } from './provider/ai-text-builder';
import { CopilotClient } from './provider/copilot-client';
import {
  createCopilotDraftCommand,
  createCopilotInBlockCommand,
  createCopilotWithSelectionCommand,
} from './command';
import { DisabledCopilotClient } from './provider/disabled-copilot-client';
import { AIRealtimeEditorEngine } from './realtime/editor-engine';
import { AIExampleLensProvider } from './lens/ai-example-lens-provider';
import type { EditorHost } from '@blocksuite/store';

export interface AIRequestOptions {
  type: AIMessageTypes;
  page: Page;
  query: string;
  sessionId?: string;
  contextId?: string;
  contextBlocks?: string[];
  messageId?: string;
  temperature?: number;
  workspaceId?: string;
}

export interface Tokens {
  prompt: number;
  completion: number;
}

export interface AICompletionRequestResult {
  response: string;
  messageId: string;
  metrics?: {
    tokens?: Tokens;
  };
}

export const vNodeToString = (vNode: VBlock): string => {
  if (vNode.type === 'text') {
    return vNode.text;
  }

  if (!vNode.children) {
    return '';
  }

  return vNode.children.map(vNodeToString).join('');
};

const defaultCopilotClientEndpoint = '';

export const createCopilotClient = (
  config: {
    endpoint?: string;
    workspaceId?: string;
    sessionId?: string;
    pageId?: string;
    disabled?: boolean;
    isSaaS?: boolean;
    serverEndpoint?: string;
    host?: typeof window;
  } = {}
) => {
  if (config.disabled) {
    return new DisabledCopilotClient();
  }

  const client = new CopilotClient({
    endpoint:
      config.endpoint ??
      config.serverEndpoint ??
      defaultCopilotClientEndpoint,
    autoStart: true,
    workspaceId: config.workspaceId ?? '',
    sessionId: config.sessionId ?? nanoid(),
    pageId: config.pageId ?? nanoid(),
    host: config.host ?? window,
    isSaaS: config.isSaaS ?? false,
  });

  // Extend the client with our embedding functionality
  extendCopilotClient();

  return client;
};

export const getDocKey = (page: Page) => {
  return `${page.workspace.id}/${page.id}`;
};

export const copilotFacade = async (
  options: AIRequestOptions
): Promise<AICompletionRequestResult> => {
  const { page, type, query, messageId, temperature, contextBlocks } = options;
  const { service: blockSuiteAIService, registry } = createContextRegistry();

  if (!query) {
    throw new Error('Empty query');
  }

  const blocks = contextBlocks ?? [];
  let contextInjector;
  contextInjector = new BlocksContextInjector(blocks, {
    page,
    maxContextWindowTokens: 3000,
    tokenCounter: DefaultAIBlockTokenCounter,
  });
  const workspace = page.workspace;
  const workspaceId = workspace.id;

  const docKey = getDocKey(page);
  const copilotClient = AIProvider.getCopilotClient();

  if (!copilotClient) {
    throw new NetworkUnavailableError('No copilot client');
  }

  blockSuiteAIService.registerClient('copilot', {
    init: async () => {
      //
    },
    /**
     * note: we're adding temperature randomly to allow different outputs for the same input
     */
    generateCompletions: async ({ messages, requestOptions }) => {
      let completion;
      try {
        const requestBuilder = await new CopilotRequestBuilder()
          .setModelType(type)
          .setWorkspaceId(workspaceId)
          .setSessionId(options.sessionId ?? nanoid())
          .setContextId(options.contextId ?? nanoid())
          .setMessageId(messageId ?? nanoid())
          .setPrompt(query)
          .setIsDraft(false)
          .build();

        for (const message of messages) {
          requestBuilder.addMessage(message);
        }

        completion = await generateCompletionsFromServer({
          requestBuilder,
          client: copilotClient,
          temperature: temperature ?? 0.5 + 0.5 * Math.random(),
        });
      } catch (err) {
        console.error(err);

        throw err;
      }

      if (!completion) {
        throw new Error('Failed to get ai completion');
      }

      return completion;
    },
  });

  const vNodes = await prepareAICompletionFromVNodes({
    registry,
    clientName: 'copilot',
    docKey,
    contextInjector,
  });

  const responseParser = new CopilotResponseParser();
  const result = await responseParser.parseCompletion(vNodes);

  return {
    response: result,
    messageId: messageId ?? nanoid(),
    metrics: {
      tokens: {
        prompt: contextInjector.tokensUsed,
        completion: 0,
      },
    },
  };
};

export const setupAI = (options: {
  workspace: Workspace;
  copilotClient: CopilotClient;
  globalDialogService: GlobalDialogService;
  aiEngine: AIRealtimeEditorEngine;
  hasUpdatedLocalStorage?: boolean;
}) => {
  const { workspace, copilotClient, globalDialogService, aiEngine } = options;

  // Register provider to the global
  const dispose = setupAIProvider(copilotClient, globalDialogService);

  const aiInjector = (editorHost: EditorHost) => {
    // Init text builder
    const textBuilder = new CopilotTextBuilder({
      copilotClient,
      workspace,
      aiEngine,
    });

    // Register text builder to the page
    if (textBuilder) {
      editorHost.std.range.bindTextBuilder(textBuilder);
      return () => {
        editorHost.std.range.unbindTextBuilder(textBuilder);
      };
    }

    return () => {
      /* nothing to dispose */
    };
  };

  const lensProviders = [
    new AIExampleLensProvider({
      copilotClient,
      workspaceId: workspace.id,
    }),
  ];

  const commands = [
    createCopilotDraftCommand({ copilotClient, aiEngine, workspace }),
    createCopilotInBlockCommand({ copilotClient, aiEngine }),
    createCopilotWithSelectionCommand({ copilotClient, aiEngine }),
  ];

  return {
    dispose: () => {
      dispose();
    },
    aiInjector,
    lensProviders,
    commands,
  };
};
