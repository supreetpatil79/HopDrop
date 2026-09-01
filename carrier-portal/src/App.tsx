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
      if (!demoMode) {
        setBootstrapping(false);
        return;
      }
      if (isAuthenticated) {
        setBootstrapping(false);
        return;
      }

      setBootstrapping(true);
      try {
        const response = await authApi.demoLogin({ persona: 'carrier' });
        if (active && response?.data?.data) {
          setAuth(response.data.data);
        }
      } catch (_error) {
        if (active) {
          setAuth({
            user: {
              _id: 'carrier_arjun_demo',
              name: 'Arjun Rao',
              email: 'arjun.rao@hopdrop.in',
              phone: '+919876543211',
              role: ['carrier', 'sender'],
              rating: { average: 4.95, count: 42 },
              wallet: { balance: 28500, escrowHeld: 1200 }
            },
            accessToken: 'demo_carrier_token',
            refreshToken: 'demo_carrier_refresh'
          });
        }
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
  }, [demoMode, isAuthenticated, setAuth, setBootstrapping]);

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={renderPage(<CarrierHome />)} />

        <Route path="/auth/login" element={isAuthenticated ? <Navigate to="/" replace /> : renderPage(<LoginPage />)} />
        <Route path="/auth/register" element={isAuthenticated ? <Navigate to="/" replace /> : renderPage(<RegisterPage />)} />
        <Route path="/auth/otp-verify" element={isAuthenticated ? <Navigate to="/" replace /> : renderPage(<OTPVerifyPage />)} />

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
