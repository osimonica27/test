/// <reference types="../global.d.ts" />

import { randomUUID } from 'node:crypto';

import type { TestFn } from 'ava';
import ava from 'ava';
import Sinon from 'sinon';

import { ConfigModule } from '../base/config';
import { AuthService } from '../core/auth';
import { WorkspaceModule } from '../core/workspaces';
import { CopilotModule } from '../plugins/copilot';
import { CopilotContextService } from '../plugins/copilot/context';
import { MockEmbeddingClient } from '../plugins/copilot/context/embedding';
import { prompts, PromptService } from '../plugins/copilot/prompt';
import {
  CopilotProviderService,
  FalProvider,
  OpenAIProvider,
  PerplexityProvider,
  registerCopilotProvider,
  unregisterCopilotProvider,
} from '../plugins/copilot/providers';
import { CopilotStorage } from '../plugins/copilot/storage';
import {
  acceptInviteById,
  createTestingApp,
  createWorkspace,
  inviteUser,
  signUp,
  TestingApp,
} from './utils';
import {
  addContextDoc,
  addContextFile,
  array2sse,
  chatWithImages,
  chatWithText,
  chatWithTextStream,
  chatWithWorkflow,
  createCopilotContext,
  createCopilotMessage,
  createCopilotSession,
  forkCopilotSession,
  getHistories,
  listContext,
  listContextFiles,
  matchContext,
  MockCopilotTestProvider,
  sse2array,
  textToEventStream,
  unsplashSearch,
  updateCopilotSession,
} from './utils/copilot';

const test = ava as TestFn<{
  auth: AuthService;
  app: TestingApp;
  context: CopilotContextService;
  prompt: PromptService;
  provider: CopilotProviderService;
  storage: CopilotStorage;
}>;

test.beforeEach(async t => {
  const { app } = await createTestingApp({
    imports: [
      ConfigModule.forRoot({
        plugins: {
          copilot: {
            openai: {
              apiKey: '1',
            },
            fal: {
              apiKey: '1',
            },
            perplexity: {
              apiKey: '1',
            },
            unsplashKey: process.env.UNSPLASH_ACCESS_KEY || '1',
          },
        },
      }),
      WorkspaceModule,
      CopilotModule,
    ],
  });

  const auth = app.get(AuthService);
  const context = app.get(CopilotContextService);
  const prompt = app.get(PromptService);
  const storage = app.get(CopilotStorage);

  t.context.app = app;
  t.context.auth = auth;
  t.context.context = context;
  t.context.prompt = prompt;
  t.context.storage = storage;
});

let token: string;
const promptName = 'prompt';
test.beforeEach(async t => {
  const { app, prompt } = t.context;
  const user = await signUp(app, 'test', 'darksky@affine.pro', '123456');
  token = user.token.token;

  unregisterCopilotProvider(OpenAIProvider.type);
  unregisterCopilotProvider(FalProvider.type);
  unregisterCopilotProvider(PerplexityProvider.type);
  registerCopilotProvider(MockCopilotTestProvider);

  await prompt.set(promptName, 'test', [
    { role: 'system', content: 'hello {{word}}' },
  ]);
});

test.afterEach.always(async t => {
  await t.context.app.close();
});

// ==================== session ====================

test('should create session correctly', async t => {
  const { app } = t.context;

  const assertCreateSession = async (
    workspaceId: string,
    error: string,
    asserter = async (x: any) => {
      t.truthy(await x, error);
    }
  ) => {
    await asserter(
      createCopilotSession(app, token, workspaceId, randomUUID(), promptName)
    );
  };

  {
    const { id } = await createWorkspace(app, token);
    await assertCreateSession(
      id,
      'should be able to create session with cloud workspace that user can access'
    );
  }

  {
    await assertCreateSession(
      randomUUID(),
      'should be able to create session with local workspace'
    );
  }

  {
    const {
      token: { token },
    } = await signUp(app, 'test', 'test@affine.pro', '123456');
    const { id } = await createWorkspace(app, token);
    await assertCreateSession(id, '', async x => {
      await t.throwsAsync(
        x,
        { instanceOf: Error },
        'should not able to create session with cloud workspace that user cannot access'
      );
    });

    const inviteId = await inviteUser(app, token, id, 'darksky@affine.pro');
    await acceptInviteById(app, id, inviteId, false);
    await assertCreateSession(
      id,
      'should able to create session after user have permission'
    );
  }
});

test('should update session correctly', async t => {
  const { app } = t.context;

  const assertUpdateSession = async (
    sessionId: string,
    error: string,
    asserter = async (x: any) => {
      t.truthy(await x, error);
    }
  ) => {
    await asserter(updateCopilotSession(app, token, sessionId, promptName));
  };

  {
    const { id: workspaceId } = await createWorkspace(app, token);
    const docId = randomUUID();
    const sessionId = await createCopilotSession(
      app,
      token,
      workspaceId,
      docId,
      promptName
    );
    await assertUpdateSession(
      sessionId,
      'should be able to update session with cloud workspace that user can access'
    );
  }

  {
    const sessionId = await createCopilotSession(
      app,
      token,
      randomUUID(),
      randomUUID(),
      promptName
    );
    await assertUpdateSession(
      sessionId,
      'should be able to update session with local workspace'
    );
  }

  {
    const aToken = (await signUp(app, 'test', 'test@affine.pro', '123456'))
      .token.token;
    const { id: workspaceId } = await createWorkspace(app, aToken);
    const inviteId = await inviteUser(
      app,
      aToken,
      workspaceId,
      'darksky@affine.pro'
    );
    await acceptInviteById(app, workspaceId, inviteId, false);
    const sessionId = await createCopilotSession(
      app,
      token,
      workspaceId,
      randomUUID(),
      promptName
    );
    await assertUpdateSession(
      sessionId,
      'should able to update session after user have permission'
    );
  }

  {
    const sessionId = '123456';
    await assertUpdateSession(sessionId, '', async x => {
      await t.throwsAsync(
        x,
        { instanceOf: Error },
        'should not able to update invalid session id'
      );
    });
  }
});

test('should fork session correctly', async t => {
  const { app } = t.context;

  const assertForkSession = async (
    token: string,
    workspaceId: string,
    sessionId: string,
    lastMessageId: string,
    error: string,
    asserter = async (x: any) => {
      const forkedSessionId = await x;
      t.truthy(forkedSessionId, error);
      return forkedSessionId;
    }
  ) =>
    await asserter(
      forkCopilotSession(
        app,
        token,
        workspaceId,
        randomUUID(),
        sessionId,
        lastMessageId
      )
    );

  // prepare session
  const { id } = await createWorkspace(app, token);
  const sessionId = await createCopilotSession(
    app,
    token,
    id,
    randomUUID(),
    promptName
  );

  let forkedSessionId: string;
  // should be able to fork session
  {
    for (let i = 0; i < 3; i++) {
      const messageId = await createCopilotMessage(app, token, sessionId);
      await chatWithText(app, token, sessionId, messageId);
    }
    const histories = await getHistories(app, token, { workspaceId: id });
    const latestMessageId = histories[0].messages.findLast(
      m => m.role === 'assistant'
    )?.id;
    t.truthy(latestMessageId, 'should find last message id');

    // should be able to fork session
    forkedSessionId = await assertForkSession(
      token,
      id,
      sessionId,
      latestMessageId!,
      'should be able to fork session with cloud workspace that user can access'
    );
  }

  {
    const {
      token: { token: newToken },
    } = await signUp(app, 'test', 'test@affine.pro', '123456');
    await assertForkSession(
      newToken,
      id,
      sessionId,
      randomUUID(),
      '',
      async x => {
        await t.throwsAsync(
          x,
          { instanceOf: Error },
          'should not able to fork session with cloud workspace that user cannot access'
        );
      }
    );

    const inviteId = await inviteUser(app, token, id, 'test@affine.pro');
    await acceptInviteById(app, id, inviteId, false);
    await assertForkSession(
      newToken,
      id,
      sessionId,
      randomUUID(),
      '',
      async x => {
        await t.throwsAsync(
          x,
          { instanceOf: Error },
          'should not able to fork a root session from other user'
        );
      }
    );

    const histories = await getHistories(app, token, { workspaceId: id });
    const latestMessageId = histories
      .find(h => h.sessionId === forkedSessionId)
      ?.messages.findLast(m => m.role === 'assistant')?.id;
    t.truthy(latestMessageId, 'should find latest message id');

    await assertForkSession(
      newToken,
      id,
      forkedSessionId,
      latestMessageId!,
      'should able to fork a forked session created by other user'
    );
  }
});

test('should be able to use test provider', async t => {
  const { app } = t.context;

  const { id } = await createWorkspace(app, token);
  t.truthy(
    await createCopilotSession(app, token, id, randomUUID(), promptName),
    'failed to create session'
  );
});

// ==================== message ====================

test('should create message correctly', async t => {
  const { app } = t.context;

  {
    const { id } = await createWorkspace(app, token);
    const sessionId = await createCopilotSession(
      app,
      token,
      id,
      randomUUID(),
      promptName
    );
    const messageId = await createCopilotMessage(app, token, sessionId);
    t.truthy(messageId, 'should be able to create message with valid session');
  }

  {
    await t.throwsAsync(
      createCopilotMessage(app, token, randomUUID()),
      { instanceOf: Error },
      'should not able to create message with invalid session'
    );
  }
});

// ==================== chat ====================

test('should be able to chat with api', async t => {
  const { app, storage } = t.context;

  Sinon.stub(storage, 'handleRemoteLink').resolvesArg(2);

  const { id } = await createWorkspace(app, token);
  const sessionId = await createCopilotSession(
    app,
    token,
    id,
    randomUUID(),
    promptName
  );
  const messageId = await createCopilotMessage(app, token, sessionId);
  const ret = await chatWithText(app, token, sessionId, messageId);
  t.is(ret, 'generate text to text', 'should be able to chat with text');

  const ret2 = await chatWithTextStream(app, token, sessionId, messageId);
  t.is(
    ret2,
    textToEventStream('generate text to text stream', messageId),
    'should be able to chat with text stream'
  );

  const ret3 = await chatWithImages(app, token, sessionId, messageId);
  t.is(
    array2sse(sse2array(ret3).filter(e => e.event !== 'event')),
    textToEventStream(
      ['https://example.com/test.jpg', 'hello '],
      messageId,
      'attachment'
    ),
    'should be able to chat with images'
  );

  Sinon.restore();
});

test('should be able to chat with api by workflow', async t => {
  const { app } = t.context;

  const { id } = await createWorkspace(app, token);
  const sessionId = await createCopilotSession(
    app,
    token,
    id,
    randomUUID(),
    'workflow:presentation'
  );
  const messageId = await createCopilotMessage(
    app,
    token,
    sessionId,
    'apple company'
  );
  const ret = await chatWithWorkflow(app, token, sessionId, messageId);
  t.is(
    array2sse(sse2array(ret).filter(e => e.event !== 'event')),
    textToEventStream(['generate text to text stream'], messageId),
    'should be able to chat with workflow'
  );
});

test('should be able to chat with special image model', async t => {
  const { app, storage } = t.context;

  Sinon.stub(storage, 'handleRemoteLink').resolvesArg(2);

  const { id } = await createWorkspace(app, token);

  const testWithModel = async (promptName: string, finalPrompt: string) => {
    const model = prompts.find(p => p.name === promptName)?.model;
    const sessionId = await createCopilotSession(
      app,
      token,
      id,
      randomUUID(),
      promptName
    );
    const messageId = await createCopilotMessage(
      app,
      token,
      sessionId,
      'some-tag',
      [`https://example.com/${promptName}.jpg`]
    );
    const ret3 = await chatWithImages(app, token, sessionId, messageId);
    t.is(
      ret3,
      textToEventStream(
        [`https://example.com/${model}.jpg`, finalPrompt],
        messageId,
        'attachment'
      ),
      'should be able to chat with images'
    );
  };

  await testWithModel('debug:action:fal-sd15', 'some-tag');
  await testWithModel(
    'debug:action:fal-upscaler',
    'best quality, 8K resolution, highres, clarity, some-tag'
  );
  await testWithModel('debug:action:fal-remove-bg', 'some-tag');

  Sinon.restore();
});

test('should be able to retry with api', async t => {
  const { app, storage } = t.context;

  Sinon.stub(storage, 'handleRemoteLink').resolvesArg(2);

  // normal chat
  {
    const { id } = await createWorkspace(app, token);
    const sessionId = await createCopilotSession(
      app,
      token,
      id,
      randomUUID(),
      promptName
    );
    const messageId = await createCopilotMessage(app, token, sessionId);
    // chat 2 times
    await chatWithText(app, token, sessionId, messageId);
    await chatWithText(app, token, sessionId, messageId);

    const histories = await getHistories(app, token, { workspaceId: id });
    t.deepEqual(
      histories.map(h => h.messages.map(m => m.content)),
      [['generate text to text', 'generate text to text']],
      'should be able to list history'
    );
  }

  // retry chat
  {
    const { id } = await createWorkspace(app, token);
    const sessionId = await createCopilotSession(
      app,
      token,
      id,
      randomUUID(),
      promptName
    );
    const messageId = await createCopilotMessage(app, token, sessionId);
    await chatWithText(app, token, sessionId, messageId);
    // retry without message id
    await chatWithText(app, token, sessionId);

    // should only have 1 message
    const histories = await getHistories(app, token, { workspaceId: id });
    t.deepEqual(
      histories.map(h => h.messages.map(m => m.content)),
      [['generate text to text']],
      'should be able to list history'
    );
  }

  Sinon.restore();
});

test('should reject message from different session', async t => {
  const { app } = t.context;

  const { id } = await createWorkspace(app, token);
  const sessionId = await createCopilotSession(
    app,
    token,
    id,
    randomUUID(),
    promptName
  );
  const anotherSessionId = await createCopilotSession(
    app,
    token,
    id,
    randomUUID(),
    promptName
  );
  const anotherMessageId = await createCopilotMessage(
    app,
    token,
    anotherSessionId
  );
  await t.throwsAsync(
    chatWithText(app, token, sessionId, anotherMessageId),
    { instanceOf: Error },
    'should reject message from different session'
  );
});

test('should reject request from different user', async t => {
  const { app } = t.context;

  const { id } = await createWorkspace(app, token);
  const sessionId = await createCopilotSession(
    app,
    token,
    id,
    randomUUID(),
    promptName
  );

  // should reject message from different user
  {
    const { token } = await signUp(app, 'a1', 'a1@affine.pro', '123456');
    await t.throwsAsync(
      createCopilotMessage(app, token.token, sessionId),
      { instanceOf: Error },
      'should reject message from different user'
    );
  }

  // should reject chat from different user
  {
    const messageId = await createCopilotMessage(app, token, sessionId);
    {
      const { token } = await signUp(app, 'a2', 'a2@affine.pro', '123456');
      await t.throwsAsync(
        chatWithText(app, token.token, sessionId, messageId),
        { instanceOf: Error },
        'should reject chat from different user'
      );
    }
  }
});

// ==================== history ====================

test('should be able to list history', async t => {
  const { app } = t.context;

  const { id: workspaceId } = await createWorkspace(app, token);
  const sessionId = await createCopilotSession(
    app,
    token,
    workspaceId,
    randomUUID(),
    promptName
  );

  const messageId = await createCopilotMessage(app, token, sessionId, 'hello');
  await chatWithText(app, token, sessionId, messageId);

  {
    const histories = await getHistories(app, token, { workspaceId });
    t.deepEqual(
      histories.map(h => h.messages.map(m => m.content)),
      [['hello', 'generate text to text']],
      'should be able to list history'
    );
  }

  {
    const histories = await getHistories(app, token, {
      workspaceId,
      options: { messageOrder: 'desc' },
    });
    t.deepEqual(
      histories.map(h => h.messages.map(m => m.content)),
      [['generate text to text', 'hello']],
      'should be able to list history'
    );
  }
});

test('should reject request that user have not permission', async t => {
  const { app } = t.context;

  const {
    token: { token: anotherToken },
  } = await signUp(app, 'a1', 'a1@affine.pro', '123456');
  const { id: workspaceId } = await createWorkspace(app, anotherToken);

  // should reject request that user have not permission
  {
    await t.throwsAsync(
      getHistories(app, token, { workspaceId }),
      { instanceOf: Error },
      'should reject request that user have not permission'
    );
  }

  // should able to list history after user have permission
  {
    const inviteId = await inviteUser(
      app,
      anotherToken,
      workspaceId,
      'darksky@affine.pro'
    );
    await acceptInviteById(app, workspaceId, inviteId, false);

    t.deepEqual(
      await getHistories(app, token, { workspaceId }),
      [],
      'should able to list history after user have permission'
    );
  }

  {
    const sessionId = await createCopilotSession(
      app,
      anotherToken,
      workspaceId,
      randomUUID(),
      promptName
    );

    const messageId = await createCopilotMessage(app, anotherToken, sessionId);
    await chatWithText(app, anotherToken, sessionId, messageId);

    const histories = await getHistories(app, anotherToken, { workspaceId });
    t.deepEqual(
      histories.map(h => h.messages.map(m => m.content)),
      [['generate text to text']],
      'should able to list history'
    );

    t.deepEqual(
      await getHistories(app, token, { workspaceId }),
      [],
      'should not list history created by another user'
    );
  }
});

test('should be able to search image from unsplash', async t => {
  const { app } = t.context;

  const resp = await unsplashSearch(app, token);
  t.not(resp.status, 404, 'route should be exists');
});

test.only('should be able to manage context', async t => {
  const { app, context } = t.context;

  const { id: workspaceId } = await createWorkspace(app, token);
  const sessionId = await createCopilotSession(
    app,
    token,
    workspaceId,
    randomUUID(),
    promptName
  );

  // use mocked embedding client
  Sinon.stub(context, 'embeddingClient').get(() => new MockEmbeddingClient());

  {
    await t.throwsAsync(
      createCopilotContext(app, token, workspaceId, randomUUID()),
      { instanceOf: Error },
      'should throw error if create context with invalid session id'
    );

    const context = createCopilotContext(app, token, workspaceId, sessionId);
    await t.notThrowsAsync(context, 'should create context with chat session');

    const list = await listContext(app, token, workspaceId, sessionId);
    t.deepEqual(
      list.map(f => ({ id: f.id })),
      [{ id: await context }],
      'should list context'
    );
  }

  const fs = await import('node:fs');
  const buffer = fs.readFileSync(
    new URL('../../../../common/native/fixtures/sample.pdf', import.meta.url)
  );

  {
    const contextId = await createCopilotContext(
      app,
      token,
      workspaceId,
      sessionId
    );

    const [{ id: fileId }] = await addContextFile(
      app,
      token,
      contextId,
      randomUUID(),
      'sample.pdf',
      buffer
    );
    const [, { id: docId }] = await addContextDoc(
      app,
      token,
      contextId,
      randomUUID()
    );

    const { files, docs } =
      (await listContextFiles(app, token, workspaceId, sessionId, contextId)) ||
      {};
    t.assert(files);
    t.assert(docs);
    const [file] = files!;
    t.is(file.id, fileId, 'should list file');
    t.is(file.status, 'finished', 'should list file status');
    t.is(file.name, 'sample.pdf', 'should list file name');
    t.is(file.chunk_size, 3, 'should split file into chunks');
    const [doc] = docs!;
    t.is(doc.id, docId, 'should list doc');

    const result = (await matchContext(app, token, contextId, 'test', 2))!;
    t.is(result.length, 2, 'should match context');
    t.is(result[0].fileId, fileId, 'should match file id');
  }
});
