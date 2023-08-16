import { WorkspaceFallback } from '@affine/component/workspace';
import { assertExists } from '@blocksuite/global/utils';
import { getCurrentStore } from '@toeverything/infra/atom';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

async function main() {
  const { setup } = await import('./bootstrap/setup');
  await setup(getCurrentStore());
  const { App } = await import('./app');
  const root = document.getElementById('app');
  assertExists(root);

  createRoot(root).render(
    <StrictMode>
      <Suspense fallback={<WorkspaceFallback key="AppLoading" />}>
        <App />
      </Suspense>
    </StrictMode>
  );
}

await main();
