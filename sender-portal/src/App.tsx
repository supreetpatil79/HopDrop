import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ErrorBoundary, LoadingState } from 'hopdrop-shared';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { authApi } from './api/auth.api';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import OTPVerifyPage from './pages/Auth/OTPVerify';
import Dashboard from './pages/Dashboard';
import SendPackage from './pages/SendPackage';
import BrowseCarriers from './pages/BrowseCarriers';
import MyTrips from './pages/MyTrips';
import MyDeliveries from './pages/MyDeliveries';
import TrackDelivery from './pages/TrackDelivery';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import NotFound from './pages/NotFound';

export default function App() {
  const { isAuthenticated, isBootstrapping, setAuth, clearAuth, setBootstrapping } = useAuth();
  const demoMode = (import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase() !== 'false';

  const renderPage = (page: JSX.Element) => <ErrorBoundary>{page}</ErrorBoundary>;

  useEffect(() => {
    let active = true;

    async function bootstrapDemoAuth() {
      if (!demoMode || isAuthenticated) {
        setBootstrapping(false);
        return;
      }

      setBootstrapping(true);
      try {
        const response = await authApi.demoLogin({ persona: 'sender_priya' });
        if (!active) {
          return;
        }
        setAuth(response.data.data);
      } catch (_error) {
        if (!active) {
          return;
        }
        clearAuth();
        toast.error('Demo login unavailable. Check backend DEMO_MODE.');
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrapDemoAuth();

    return () => {
      active = false;
    };
  }, [demoMode, isAuthenticated, setAuth, clearAuth, setBootstrapping]);

  if (demoMode && isBootstrapping) {
    return (
      <AppLayout>
        <LoadingState
          title="Starting your sender workspace"
          description="No OTP needed in demo mode. We’re connecting your live dashboard, trips, and delivery feed."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={renderPage(<Home />)} />

        <Route path="/auth/login" element={demoMode ? <Navigate to="/dashboard" replace /> : renderPage(<LoginPage />)} />
        <Route path="/auth/register" element={demoMode ? <Navigate to="/dashboard" replace /> : renderPage(<RegisterPage />)} />
        <Route path="/auth/otp-verify" element={demoMode ? <Navigate to="/dashboard" replace /> : renderPage(<OTPVerifyPage />)} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {renderPage(<Dashboard />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/send-package"
          element={
            <ProtectedRoute>
              {renderPage(<SendPackage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse-carriers"
          element={
            <ProtectedRoute>
              {renderPage(<BrowseCarriers />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse-trips"
          element={
            <ProtectedRoute>
              {renderPage(<BrowseCarriers />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-trips"
          element={
            <ProtectedRoute>
              {renderPage(<MyTrips />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-deliveries"
          element={
            <ProtectedRoute>
              {renderPage(<MyDeliveries />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-delivery/:matchId"
          element={
            <ProtectedRoute>
              {renderPage(<TrackDelivery />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches/:matchId"
          element={
            <ProtectedRoute>
              {renderPage(<TrackDelivery />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              {renderPage(<Profile />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              {renderPage(<Wallet />)}
            </ProtectedRoute>
          }
        />

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={renderPage(<NotFound />)} />
      </Routes>
    </AppLayout>
  );
}
