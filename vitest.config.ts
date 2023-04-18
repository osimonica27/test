import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      'next/router': 'next-router-mock',
      'next/config': resolve(rootDir, './scripts/vitest/next-config-mock.ts'),
    },
  },
  test: {
    setupFiles: [
      resolve(rootDir, './scripts/setup/search.ts'),
      resolve(rootDir, './scripts/setup/lottie-web.ts'),
    ],
    exclude: [
      // e2e tests
      '**/parallels/**',
      '**/node_modules/**',
    ],
    testTimeout: 5000,
    coverage: {
      provider: 'istanbul', // or 'c8'
      reporter: ['lcov'],
      reportsDirectory: '.coverage/store',
    },
  },
});
