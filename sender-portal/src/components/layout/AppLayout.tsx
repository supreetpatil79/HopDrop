import { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { ConnectionStatusBar } from './ConnectionStatusBar';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { useDwellTracker } from '../../hooks/useDwellTracker';
import { useAuth } from '../../hooks/useAuth';

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/otp-verify'];

export function AppLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Silently tracks dwell time per page — sends beacon to /api/v1/analytics/dwell on nav/close
  useDwellTracker(isAuthenticated ? 'authenticated' : undefined);

  // Auth pages render fullscreen with no chrome
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen text-text">
      <Navbar />
      <ConnectionStatusBar />
      <main className="page-shell">{children}</main>
      <Footer />
    </div>
  );
}
