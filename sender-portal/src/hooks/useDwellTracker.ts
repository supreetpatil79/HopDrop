import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

function getSessionId(): string {
  let id = sessionStorage.getItem('hitch_sid');
  if (!id) {
    id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('hitch_sid', id);
  }
  return id;
}

/**
 * Tracks dwell time on each page and sends a beacon on navigation or tab close.
 * Zero external dependencies — 20 lines of vanilla logic.
 */
export function useDwellTracker(userId?: string) {
  const location = useLocation();
  const entryMs = useRef(Date.now());
  const lastPage = useRef(location.pathname);

  const flush = (page: string) => {
    const durationMs = Date.now() - entryMs.current;
    if (durationMs < 1000) return; // ignore sub-second page blips
    const payload = JSON.stringify({ sessionId: getSessionId(), page, durationMs, userId });
    // Use sendBeacon when available — it survives tab close
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/api/v1/analytics/dwell`, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(`${API_BASE}/api/v1/analytics/dwell`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  };

  useEffect(() => {
    // New page — flush previous page dwell and reset
    if (lastPage.current !== location.pathname) {
      flush(lastPage.current);
      lastPage.current = location.pathname;
      entryMs.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const onUnload = () => flush(lastPage.current);
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
