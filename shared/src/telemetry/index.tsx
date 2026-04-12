import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/browser';
import posthog from 'posthog-js';
import { useLocation, useNavigationType } from 'react-router-dom';

type TelemetryUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string[];
};

type UseAuthHook = () => {
  user?: TelemetryUser | null;
  isAuthenticated?: boolean;
};

export interface ClientTelemetryConfig {
  appName: string;
  environment: string;
  release?: string;
  posthogKey?: string;
  posthogHost?: string;
  sentryDsn?: string;
  debug?: boolean;
}

let telemetryConfig: ClientTelemetryConfig | null = null;
let sentryInitialized = false;
let posthogInitialized = false;

function getFlowName(appName: string) {
  return appName.includes('carrier') ? 'carrier_activation' : 'sender_activation';
}

function getDurationSeconds(startedAt: number) {
  return Number(((Date.now() - startedAt) / 1000).toFixed(2));
}

export function initClientTelemetry(config: ClientTelemetryConfig) {
  telemetryConfig = config;

  if (config.sentryDsn && !sentryInitialized) {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.environment,
      release: config.release
    });
    sentryInitialized = true;
  }

  if (config.posthogKey && !posthogInitialized) {
    posthog.init(config.posthogKey, {
      api_host: config.posthogHost || 'https://app.posthog.com',
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
      loaded: (client) => {
        if (config.debug) {
          client.debug();
        }
      }
    });
    posthogInitialized = true;
  }
}

export function captureAnalyticsEvent(event: string, properties: Record<string, unknown> = {}) {
  if (!posthogInitialized || !telemetryConfig) {
    return;
  }

  posthog.capture(event, {
    app_name: telemetryConfig.appName,
    environment: telemetryConfig.environment,
    ...properties
  });
}

export function captureClientError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);

  if (sentryInitialized) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error instanceof Error ? error : new Error(message));
    });
  }

  captureAnalyticsEvent('client_error', {
    message,
    ...context
  });
}

export function identifyTelemetryUser(user: TelemetryUser | null | undefined) {
  if (!user?._id) {
    return;
  }

  if (posthogInitialized) {
    posthog.identify(user._id, {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
  }

  if (sentryInitialized) {
    Sentry.setUser({
      id: user._id,
      username: user.name,
      email: user.email
    });
  }
}

export function resetTelemetryUser() {
  if (posthogInitialized) {
    posthog.reset();
  }

  if (sentryInitialized) {
    Sentry.setUser(null);
  }
}

export function trackFunnelStep(flow: string, step: string, properties: Record<string, unknown> = {}) {
  captureAnalyticsEvent('funnel_step', {
    flow,
    step,
    ...properties
  });
}

export function trackCtaClick(cta: string, properties: Record<string, unknown> = {}) {
  captureAnalyticsEvent('cta_clicked', {
    cta,
    ...properties
  });
}

export function createTelemetryBridge(useAuthHook: UseAuthHook) {
  return function TelemetryBridge({ appName }: { appName: string }) {
    const location = useLocation();
    const navigationType = useNavigationType();
    const { user, isAuthenticated } = useAuthHook();
    const sessionStartedAtRef = useRef(Date.now());
    const previousPathRef = useRef<string | null>(null);
    const pageStartedAtRef = useRef(Date.now());

    useEffect(() => {
      const sessionStorageKey = `hopdrop:${appName}:session-started`;

      if (!sessionStorage.getItem(sessionStorageKey)) {
        sessionStorage.setItem(sessionStorageKey, String(Date.now()));
        captureAnalyticsEvent('session_started', {
          authenticated: Boolean(isAuthenticated),
          entry_path: `${location.pathname}${location.search}`
        });
      }

      const handleBeforeUnload = () => {
        captureAnalyticsEvent('session_ended', {
          duration_seconds: getDurationSeconds(sessionStartedAtRef.current),
          exit_path: previousPathRef.current || `${location.pathname}${location.search}`
        });
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [appName, isAuthenticated, location.pathname, location.search]);

    useEffect(() => {
      const currentPath = `${location.pathname}${location.search}`;
      const now = Date.now();

      if (previousPathRef.current) {
        captureAnalyticsEvent('page_leave', {
          path: previousPathRef.current,
          duration_seconds: getDurationSeconds(pageStartedAtRef.current)
        });
      }

      previousPathRef.current = currentPath;
      pageStartedAtRef.current = now;

      captureAnalyticsEvent('page_view', {
        path: currentPath,
        navigation_type: navigationType
      });
    }, [location.pathname, location.search, navigationType]);

    useEffect(() => {
      if (isAuthenticated && user?._id) {
        identifyTelemetryUser(user);

        const retentionKey = `hopdrop:${appName}:last-authenticated-at:${user._id}`;
        const previous = Number(localStorage.getItem(retentionKey) || '0');
        const now = Date.now();

        if (previous > 0 && now - previous >= 24 * 60 * 60 * 1000) {
          trackFunnelStep(getFlowName(appName), 'retained_session', {
            days_since_last_seen: Math.max(1, Math.floor((now - previous) / (24 * 60 * 60 * 1000)))
          });
        }

        localStorage.setItem(retentionKey, String(now));
        return;
      }

      resetTelemetryUser();
    }, [appName, isAuthenticated, user?._id, user?.name, user?.email, user?.phone]);

    return null;
  };
}
