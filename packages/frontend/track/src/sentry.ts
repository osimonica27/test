import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

function createSentry() {
  const wrapped = {
    init(enabled = false) {
      // https://docs.sentry.io/platforms/javascript/guides/react/#configure
      Sentry.init({
        enabled: enabled,
        dsn: process.env.SENTRY_DSN,
        debug: BUILD_CONFIG.debug ?? false,
        environment: process.env.BUILD_TYPE ?? 'development',
        integrations: [
          Sentry.reactRouterV6BrowserTracingIntegration({
            useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes,
          }),
        ],
      });
      Sentry.setTags({
        appVersion: BUILD_CONFIG.appVersion,
        editorVersion: BUILD_CONFIG.editorVersion,
      });
    },
    enable() {
      this.init(true);
    },
    close() {
      Sentry.getClient()?.close();
    },
  };

  return wrapped;
}

export const sentry = createSentry();
