import { createRandomAIUser } from '@affine-test/kit/utils/cloud';
import { openHomePage, setCoreUrl } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { createLocalWorkspace } from '@affine-test/kit/utils/workspace';
import type { Page } from '@playwright/test';

export class TestUtils {
  private static instance: TestUtils;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    if (
      process.env.PLAYWRIGHT_USER_AGENT &&
      process.env.PLAYWRIGHT_EMAIL &&
      !process.env.PLAYWRIGHT_PASSWORD
    ) {
      setCoreUrl(process.env.PLAYWRIGHT_CORE_URL || 'http://localhost:8080');
      this.isProduction = true;
    }
  }

  public static getInstance(): TestUtils {
    if (!TestUtils.instance) {
      TestUtils.instance = new TestUtils();
    }
    return TestUtils.instance;
  }

  public getUser() {
    if (
      !this.isProduction ||
      !process.env.PLAYWRIGHT_EMAIL ||
      !process.env.PLAYWRIGHT_PASSWORD
    ) {
      return createRandomAIUser();
    }

    return {
      email: process.env.PLAYWRIGHT_EMAIL,
      password: process.env.PLAYWRIGHT_PASSWORD,
    };
  }

  public async setupTestEnvironment(page: Page) {
    await openHomePage(page);
    await waitForEditorLoad(page);
    await clickNewPageButton(page);
  }

  public async createTestWorkspace(page: Page, name: string = 'test') {
    await createLocalWorkspace({ name }, page);
  }
}
