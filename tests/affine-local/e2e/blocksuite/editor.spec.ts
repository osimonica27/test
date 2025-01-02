import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  addDatabase,
  addKanban,
  clickNewPageButton,
  getBlockSuiteEditorTitle,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test('database is useable', async ({ page }) => {
  test.slow();
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.pressSequentially('test title');
  await page.keyboard.press('Enter');
  expect(await title.innerText()).toBe('test title');
  await addDatabase(page);
  const database = page.locator('affine-database');
  await expect(database).toBeVisible();
  await page.reload();
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  const title2 = getBlockSuiteEditorTitle(page);
  await title2.pressSequentially('test title2');
  await page.waitForTimeout(500);
  expect(await title2.innerText()).toBe('test title2');
  await page.keyboard.press('Enter');
  await addDatabase(page);
  const database2 = page.locator('affine-database');
  await expect(database2).toBeVisible();
});


test('kanban drag and drop is useable', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);

  await page.locator('[data-testid=page-editor-blank]').click();
  await addKanban(page);

  // NOTE: the following code is the same as the test in
  // tests/affine-mobile/e2e/kanban.spec.ts apart from the locator names

  const database = page.locator('affine-database');
  await expect(database).toBeVisible();

  // find the card in the 0th group
  const cardId = await page.locator("affine-data-view-kanban-group").nth(0).locator('affine-data-view-kanban-card').getAttribute("data-card-id")
  expect(cardId).toBeTruthy()

  // drag the card across by one group
  await page.locator(`[data-card-id="${cardId}"]`).hover()
  await page.mouse.down();
  await page.locator(".group-header").nth(1).hover()

  // drag preview of card should be visible
  await expect(page.locator(".with-data-view-css-variable .card-body")).toBeVisible()

  // wiggle the card a bit and then drop it (not sure how to do this in a non-racey way)
  await page.locator(".group-body").nth(1).hover({ force: true })
  await page.mouse.up()

  // assert that it is in the intended column
  await expect(page.locator(".group-body").nth(1).locator(`[data-card-id="${cardId}"]`)).toBeVisible()
});

test('link page is useable', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await waitForEditorLoad(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.pressSequentially('page1');
  await page.keyboard.press('Enter');
  expect(await title.innerText()).toBe('page1');
  await clickNewPageButton(page);
  await waitForEditorLoad(page);
  const title2 = getBlockSuiteEditorTitle(page);
  await title2.pressSequentially('page2');
  await page.keyboard.press('Enter');
  expect(await title2.innerText()).toBe('page2');
  await page.keyboard.press('@', { delay: 50 });
  await page.keyboard.press('p');
  await page.keyboard.press('a');
  await page.keyboard.press('g');
  await page.keyboard.press('e');
  await page.keyboard.press('1');
  await page.locator('icon-button:has-text("page1")').first().click();
  const link = page.locator('.affine-reference');
  await expect(link).toBeVisible();
  await page.click('.affine-reference');
  await page.waitForTimeout(500);

  await expect(
    page.locator('.doc-title-container:has-text("page1")')
  ).toBeVisible();
});

test('append paragraph when click editor gap', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await waitForEditorLoad(page);

  const title = getBlockSuiteEditorTitle(page);
  await title.pressSequentially('test title');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('test content');

  const paragraph = page.locator('affine-paragraph');
  const numParagraphs = await paragraph.count();

  await page.locator('[data-testid=page-editor-blank]').click();
  expect(await paragraph.count()).toBe(numParagraphs + 1);

  // click the gap again, should not append another paragraph
  await page.locator('[data-testid=page-editor-blank]').click();
  expect(await paragraph.count()).toBe(numParagraphs + 1);
});
