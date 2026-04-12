import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Truck, Wallet } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { getSenderPortalHref } from '../../utils/portal';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, clearAuth } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-dark">
          <span className="rounded bg-dark px-2 py-1 text-primary">HD</span>
          HopDrop Carrier
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          <NavLink className="text-sm text-text-muted hover:text-text" to="/post-trip">
            Post Trip
          </NavLink>
          <NavLink className="text-sm text-text-muted hover:text-text" to="/incoming-requests">
            Incoming Requests
          </NavLink>
          <NavLink className="text-sm text-text-muted hover:text-text" to="/my-trips">
            My Trips
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <a href={getSenderPortalHref(location.pathname)}>
            <Button variant="ghost">Sender View</Button>
          </a>
          {isAuthenticated ? (
            <>
              <Button variant="ghost" onClick={() => navigate('/earnings')}>
                <Wallet className="mr-1 h-4 w-4" />
                Earnings
              </Button>
              <Button variant="ghost" onClick={() => navigate('/profile')}>
                <Truck className="mr-1 h-4 w-4" />
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
              <Button variant="ghost" onClick={() => navigate('/auth/login')}>
                Login
              </Button>
              <Button variant="primary" onClick={() => navigate('/auth/register')}>
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
