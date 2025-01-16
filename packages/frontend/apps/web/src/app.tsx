import { AffineContext } from '@affine/core/components/context';
import { AppContainer } from '@affine/core/desktop/components/app-container';
import { router } from '@affine/core/desktop/router';
import { configureCommonModules } from '@affine/core/modules';
import { I18nProvider } from '@affine/core/modules/i18n';
import { LifecycleService } from '@affine/core/modules/lifecycle';
import { OpenInAppGuard } from '@affine/core/modules/open-in-app';
import {
  configureLocalStorageStateStorageImpls,
  NbstoreProvider,
} from '@affine/core/modules/storage';
import { PopupWindowProvider } from '@affine/core/modules/url';
import { configureBrowserWorkbenchModule } from '@affine/core/modules/workbench';
import { configureBrowserWorkspaceFlavours } from '@affine/core/modules/workspace-engine';
import createEmotionCache from '@affine/core/utils/create-emotion-cache';
import { WorkerClient } from '@affine/nbstore/worker/client';
import { CacheProvider } from '@emotion/react';
import { Framework, FrameworkRoot, getCurrentStore } from '@toeverything/infra';
import { OpClient } from '@toeverything/infra/op';
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';

const cache = createEmotionCache();

const future = {
  v7_startTransition: true,
} as const;

const framework = new Framework();
configureCommonModules(framework);
configureBrowserWorkbenchModule(framework);
configureLocalStorageStateStorageImpls(framework);
configureBrowserWorkspaceFlavours(framework);
framework.impl(NbstoreProvider, {
  openStore(key, options) {
    if (window.SharedWorker) {
      const worker = new SharedWorker(
        new URL(
          /* webpackChunkName: "nbstore" */ './nbstore.ts',
          import.meta.url
        ),
        { name: key }
      );
      const client = new WorkerClient(new OpClient(worker.port), options);
      return {
        store: client,
        dispose: () => {
          worker.port.postMessage({ type: '__close__' });
          worker.port.close();
        },
      };
    } else {
      const worker = new Worker(
        new URL(
          /* webpackChunkName: "nbstore" */ './nbstore.ts',
          import.meta.url
        )
      );
      const client = new WorkerClient(new OpClient(worker), options);
      return {
        store: client,
        dispose: () => {
          worker.terminate();
        },
      };
    }
  },
});
framework.impl(PopupWindowProvider, {
  open: (target: string) => {
    const targetUrl = new URL(target);

    let url: string;
    // safe to open directly if in the same origin
    if (targetUrl.origin === location.origin) {
      url = target;
    } else {
      const redirectProxy = location.origin + '/redirect-proxy';
      const search = new URLSearchParams({
        redirect_uri: target,
      });

      url = `${redirectProxy}?${search.toString()}`;
    }
    window.open(url, '_blank', 'noreferrer noopener');
  },
});
const frameworkProvider = framework.provider();

// setup application lifecycle events, and emit application start event
window.addEventListener('focus', () => {
  frameworkProvider.get(LifecycleService).applicationFocus();
});
frameworkProvider.get(LifecycleService).applicationStart();

export function App() {
  return (
    <Suspense>
      <FrameworkRoot framework={frameworkProvider}>
        <CacheProvider value={cache}>
          <I18nProvider>
            <AffineContext store={getCurrentStore()}>
              <OpenInAppGuard>
                <RouterProvider
                  fallbackElement={<AppContainer fallback />}
                  router={router}
                  future={future}
                />
              </OpenInAppGuard>
            </AffineContext>
          </I18nProvider>
        </CacheProvider>
      </FrameworkRoot>
    </Suspense>
  );
}
