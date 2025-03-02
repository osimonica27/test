import './setup';

import { useAppSettingHelper } from '@affine/core/components/hooks/affine/use-app-setting-helper';
import { sentry } from '@affine/track';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

function MainApp() {
  const { appSettings } = useAppSettingHelper();
  useEffect(() => {
    if (
      (BUILD_CONFIG.debug || window.SENTRY_RELEASE) &&
      !!appSettings.enableTelemetry
    ) {
      sentry.enable();
    }
  }, [appSettings.enableTelemetry]);

  return <App />;
}

function mountApp() {
  // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion
  const root = document.getElementById('app')!;
  createRoot(root).render(
    <StrictMode>
      <MainApp /> {}
    </StrictMode>
  );
}

try {
  mountApp();
} catch (err) {
  console.error('Failed to bootstrap app', err);
}
