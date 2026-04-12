import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
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
import NotFound from './pages/NotFound';

export default function App() {
  const { isAuthenticated, isBootstrapping, setAuth, clearAuth, setBootstrapping } = useAuth();
  const demoMode = (import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase() !== 'false';

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
        <div className="py-16 text-center">
          <h1 className="text-xl font-semibold text-text">Starting HopDrop demo workspace</h1>
          <p className="mt-2 text-sm text-text-muted">No OTP needed. Connecting your live dashboard.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<CarrierHome />} />

        <Route path="/auth/login" element={demoMode ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/auth/register" element={demoMode ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="/auth/otp-verify" element={demoMode ? <Navigate to="/" replace /> : <OTPVerifyPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CarrierHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post-trip"
          element={
            <ProtectedRoute>
              <PostTrip />
            </ProtectedRoute>
          }
        />
        <Route
          path="/incoming-requests"
          element={
            <ProtectedRoute>
              <IncomingRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/active-delivery/:matchId"
          element={
            <ProtectedRoute>
              <ActiveDelivery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-trips"
          element={
            <ProtectedRoute>
              <MyTrips />
            </ProtectedRoute>
          }
        />
        <Route
          path="/earnings"
          element={
            <ProtectedRoute>
              <Earnings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
