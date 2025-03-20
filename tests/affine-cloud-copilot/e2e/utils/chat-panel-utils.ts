import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ChatPanelUtils {
  public static async openChatPanel(page: Page) {
    if (await page.getByTestId('sidebar-tab-chat').isHidden()) {
      await page.getByTestId('right-sidebar-toggle').click({
        delay: 200,
      });
    }
    await page.getByTestId('sidebar-tab-chat').click();
    await expect(page.getByTestId('sidebar-tab-content-chat')).toBeVisible();
  }

  public static async typeChat(page: Page, content: string) {
    await page.getByTestId('chat-panel-input').focus();
    await page.keyboard.type(content);
  }

  public static async typeChatSequentially(page: Page, content: string) {
    const input = await page.locator('chat-panel-input textarea').nth(0);
    await input.pressSequentially(content, {
      delay: 50,
    });
  }

  public static async makeChat(page: Page, content: string) {
    await this.openChatPanel(page);
    await this.typeChat(page, content);
    await page.keyboard.press('Enter');
  }

  public static async clearChat(page: Page) {
    await page.getByTestId('chat-panel-clear').click();
    await page.getByTestId('confirm-modal-confirm').click();
    await page.waitForTimeout(500);
  }

  public static async collectHistory(page: Page) {
    const chatPanel = await page.waitForSelector('.chat-panel-messages');
    return Promise.all(
      Array.from(
        await chatPanel.$$(
          'chat-message-user,chat-message-assistant,chat-message-action'
        )
      ).map(async m => {
        const isAssistant = await m.evaluate(
          el => el.tagName.toLocaleLowerCase() === 'chat-message-assistant'
        );
        const isChatAction = await m.evaluate(
          el => el.tagName.toLocaleLowerCase() === 'chat-message-action'
        );

        return isAssistant || isChatAction
          ? {
              name: await m.$('.user-info').then(i => i?.innerText()),
              content: await m
                .$('chat-content-rich-text')
                .then(t => t?.$('editor-host'))
                .then(e => e?.innerText()),
            }
          : {
              name: 'You',
              content: await m.$('.text-content').then(i => i?.innerText()),
            };
      })
    );
  }
}
