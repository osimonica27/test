import { getBlockSuiteEditorTitle } from '@affine-test/kit/utils/page-logic';
import type { Page } from '@playwright/test';

export class EditorUtils {
  public static async focusToEditor(page: Page) {
    const title = getBlockSuiteEditorTitle(page);
    await title.focus();
    await page.keyboard.press('Enter');
  }

  public static async getEditorContent(page: Page) {
    let content = '';
    let retry = 3;
    while (!content && retry > 0) {
      const lines = await page.$$('page-editor .inline-editor');
      const contents = await Promise.all(lines.map(el => el.innerText()));
      content = contents
        .map(c => c.replace(/\u200B/g, '').trim())
        .filter(c => !!c)
        .join('\n');
      if (!content) {
        await page.waitForTimeout(500);
        retry -= 1;
      }
    }
    return content;
  }

  public static async switchToEdgelessMode(page: Page) {
    const editor = await page.waitForSelector('page-editor');
    await page.getByTestId('switch-edgeless-mode-button').click();
    editor.waitForElementState('hidden');
    await page.waitForSelector('edgeless-editor');
  }
}
