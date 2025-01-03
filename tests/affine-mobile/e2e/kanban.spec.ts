import { test } from '@affine-test/kit/mobile';
import { expect } from '@playwright/test';

import { openTab } from './utils';



test('kanban drag and drop', async ({ page }) => {
  // directly open new doc, should not show back
  await openTab(page, 'New Page');

  await page.locator('affine-paragraph').click();

  await expect(page.locator('affine-keyboard-toolbar')).toBeVisible()
  // Hack: force the toolbar to be visible (normally it is hidden behind the AppTabs widget),
  // and we can only click it once the virtual keyboard pushes it up, but there is no virtual
  // keyboard in playwright.
  await page.evaluate(() => {
    const el = document.getElementsByTagName("affine-keyboard-toolbar")[0];
    // @ts-expect-error el is actually an AffineKeyboardToolbarWidget
    el._panelHeight$.value = 260;
  })
  await page.locator('affine-keyboard-toolbar div').first().click();
  await page.locator('icon-button').first().click();
  await page.locator('affine-keyboard-tool-panel div').filter({
    hasText: 'Database Table view Kanban'
  }).getByRole('button').nth(1).click();

  // NOTE: the following code is the same as the test in
  // tests/affine-local/e2e/blocksuite/editor.spec.ts apart from the locator names

  const database = page.locator('affine-database');
  await expect(database).toBeVisible();

  // find the card in the 0th group
  const cardId = await page.locator("mobile-kanban-group").nth(0).locator('mobile-kanban-card').getAttribute("data-card-id")
  expect(cardId).toBeTruthy()

  // drag the card across by one group
  await page.locator(`[data-card-id="${cardId}"]`).hover()
  await page.mouse.down();
  await page.locator(".mobile-group-header").nth(1).hover()

  // drag preview of card should be visible
  await expect(page.locator(".with-data-view-css-variable .mobile-card-body")).toBeVisible()

  // wiggle the card a bit and then drop it (not sure how to do this in a non-racey way)
  await page.locator(".mobile-group-body").nth(1).hover({ force: true })
  await page.mouse.up()

  // assert that it is in the intended column
  await expect(page.locator(".mobile-group-body").nth(1).locator(`[data-card-id="${cardId}"]`)).toBeVisible()
});
