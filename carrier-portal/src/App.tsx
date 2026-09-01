import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ErrorBoundary, LoadingState } from 'hopdrop-shared';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { authApi } from './api/auth.api';
import { useAuth } from './hooks/useAuth';
import CarrierHome from './pages/CarrierHome';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import OTPVerifyPage from './pages/Auth/OTPVerify';
import PostTrip from './pages/PostTrip';
import IncomingRequests from './pages/IncomingRequests';
import ActiveDelivery from './pages/ActiveDelivery';
import MyTrips from './pages/MyTrips';
import Profile from './pages/Profile';
import Earnings from './pages/Earnings';
import CarrierSetup from './pages/CarrierSetup';
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
        const response = await authApi.demoLogin({ persona: 'carrier' });
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
          title="Starting your carrier workspace"
          description="No OTP needed in demo mode. We’re connecting your trip board, incoming requests, and live delivery feed."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={renderPage(<CarrierHome />)} />

        <Route path="/auth/login" element={demoMode ? <Navigate to="/" replace /> : renderPage(<LoginPage />)} />
        <Route path="/auth/register" element={demoMode ? <Navigate to="/" replace /> : renderPage(<RegisterPage />)} />
        <Route path="/auth/otp-verify" element={demoMode ? <Navigate to="/" replace /> : renderPage(<OTPVerifyPage />)} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {renderPage(<CarrierHome />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/post-trip"
          element={
            <ProtectedRoute>
              {renderPage(<PostTrip />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/incoming-requests"
          element={
            <ProtectedRoute>
              {renderPage(<IncomingRequests />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/active-delivery/:matchId"
          element={
            <ProtectedRoute>
              {renderPage(<ActiveDelivery />)}
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
          path="/earnings"
          element={
            <ProtectedRoute>
              {renderPage(<Earnings />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              {renderPage(<CarrierSetup />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              {renderPage(<CarrierSetup />)}
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
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={renderPage(<NotFound />)} />
      </Routes>
    </AppLayout>
  );
}
