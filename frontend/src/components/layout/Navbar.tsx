import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { PackageCheck, Truck, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

type DemoPersona = 'carrier' | 'sender_priya' | 'sender_rahul';

export function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, clearAuth, setAuth } = useAuth();
  const demoMode = (import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase() !== 'false';
  const [switchingPersona, setSwitchingPersona] = useState<DemoPersona | null>(null);

  async function switchDemoPersona(persona: DemoPersona) {
    setSwitchingPersona(persona);
    try {
      const response = await authApi.demoLogin({ persona });
      setAuth(response.data.data);
      toast.success(`Switched to ${persona === 'carrier' ? 'carrier' : 'sender'} view`);
      navigate('/dashboard');
    } catch (_error) {
      toast.error('Unable to switch demo persona right now');
    } finally {
      setSwitchingPersona(null);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-dark">
          <span className="rounded bg-dark px-2 py-1 text-primary">HD</span>
          HopDrop
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          <NavLink className="text-sm text-text-muted hover:text-text" to="/browse-trips">
            Browse Trips
          </NavLink>
          <NavLink className="text-sm text-text-muted hover:text-text" to="/post-trip">
            Post Trip
          </NavLink>
          <NavLink className="text-sm text-text-muted hover:text-text" to="/send-package">
            Send Package
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {demoMode ? (
                <>
                  <Button variant="ghost" onClick={() => switchDemoPersona('sender_priya')} disabled={Boolean(switchingPersona)}>
                    Sender View
                  </Button>
                  <Button variant="ghost" onClick={() => switchDemoPersona('carrier')} disabled={Boolean(switchingPersona)}>
                    Carrier View
                  </Button>
                </>
              ) : null}
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <Truck className="mr-1 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" onClick={() => navigate('/wallet')}>
                <Wallet className="mr-1 h-4 w-4" />
                Wallet
              </Button>
              <Button variant="ghost" onClick={() => navigate('/profile')}>
                <PackageCheck className="mr-1 h-4 w-4" />
                {user?.name?.split(' ')[0] || 'Profile'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  clearAuth();
                  navigate('/');
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              {demoMode ? (
                <span className="text-sm font-medium text-primary">Demo mode active</span>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate('/auth/login')}>
                    Login
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/auth/register')}>
                    Register
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
