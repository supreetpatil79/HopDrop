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
  appName: 'carrier-web',
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
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/carrier">
        <TelemetryBridge appName="carrier-web" />
        <App />
        <Toaster
          position="top-right"
          gutter={12}
          containerStyle={{ top: 88 }}
          toastOptions={{
            style: {
              background: '#0b1220',
              color: '#f8fafc',
              border: '1px solid rgba(148, 163, 184, 0.18)',
              borderRadius: '18px',
              boxShadow: '0 18px 50px -24px rgba(15, 23, 42, 0.55)'
            },
            success: {
              iconTheme: {
                primary: '#0f766e',
                secondary: '#f8fafc'
              }
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#f8fafc'
              }
            }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
