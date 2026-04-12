import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { captureClientError, createTelemetryBridge, initClientTelemetry } from 'hopdrop-shared';
import App from './App';
import { useAuth } from './hooks/useAuth';
import './index.css';

initClientTelemetry({
  appName: 'sender-web',
  environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
  release: import.meta.env.VITE_RELEASE,
  posthogKey: import.meta.env.VITE_POSTHOG_KEY,
  posthogHost: import.meta.env.VITE_POSTHOG_HOST,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  debug: (import.meta.env.VITE_ANALYTICS_DEBUG || '').toLowerCase() === 'true'
});

const TelemetryBridge = createTelemetryBridge(useAuth);

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      captureClientError(error, {
        source: 'react_query',
        query_key: JSON.stringify(query.queryKey)
      });
    }
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      captureClientError(error, {
        source: 'react_mutation',
        mutation_key: mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : 'unknown'
      });
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TelemetryBridge appName="sender-web" />
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#ffffff',
              border: '1px solid #1f2937'
            }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
