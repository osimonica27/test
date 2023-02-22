import { AppProps } from 'next/app';
import { Suspense, useMemo } from 'react';
import { SWRConfig } from 'swr';

import { ProviderComposer } from '../components/ProviderComposer';
import { ThemeProvider } from '../providers/ThemeProvider';
import { fetcher } from '../shared';

function App({ Component }: AppProps) {
  return (
    <SWRConfig
      value={{
        suspense: true,
        fetcher,
      }}
    >
      <Suspense fallback="loading">
        <ProviderComposer
          contexts={useMemo(() => [<ThemeProvider key="ThemeProvider" />], [])}
        >
          <Component />
        </ProviderComposer>
      </Suspense>
    </SWRConfig>
  );
}

export default App;
