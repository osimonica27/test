import { test as base } from '@affine-test/kit/playwright';

import { ChatPanelUtils } from '../utils/chat-panel-utils';
import { EditorUtils } from '../utils/editor-utils';
import { TestUtils } from '../utils/test-utils';

interface TestUtilsFixtures {
  utils: {
    testUtils: TestUtils;
    chatPanel: typeof ChatPanelUtils;
    editor: typeof EditorUtils;
  };
}

export const test = base.extend<TestUtilsFixtures>({
  utils: async (_, use) => {
    const testUtils = TestUtils.getInstance();
    await use({
      testUtils,
      chatPanel: ChatPanelUtils,
      editor: EditorUtils,
    });
  },
});

export type TestFixtures = typeof test;
