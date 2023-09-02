import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  getBlockSuiteEditorTitle,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test('click btn new page', async ({ page, workspace }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  const originPageId = page.url().split('/').reverse()[0];
  await clickNewPageButton(page);
  const newPageId = page.url().split('/').reverse()[0];
  expect(newPageId).not.toBe(originPageId);
  const currentWorkspace = await workspace.current();

  expect(currentWorkspace.flavour).toContain('local');
});

test('click btn bew page and find it in all pages', async ({
  page,
  workspace,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await getBlockSuiteEditorTitle(page).click();
  await getBlockSuiteEditorTitle(page).fill('this is a new page');
  await page.getByTestId('all-pages').click();
  const cell = page.getByRole('cell', { name: 'this is a new page' });
  expect(cell).not.toBeUndefined();
  const currentWorkspace = await workspace.current();

  expect(currentWorkspace.flavour).toContain('local');
});
