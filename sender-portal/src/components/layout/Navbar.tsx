import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { PackageCheck, Wallet } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { getCarrierPortalHref } from '../../utils/portal';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, clearAuth } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-dark">
          <span className="rounded bg-dark px-2 py-1 text-primary">HD</span>
          HopDrop Sender
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          <NavLink className="text-sm text-text-muted hover:text-text" to="/send-package">
            Send Package
          </NavLink>
          <NavLink className="text-sm text-text-muted hover:text-text" to="/browse-carriers">
            Browse Carriers
          </NavLink>
          <NavLink className="text-sm text-text-muted hover:text-text" to="/my-deliveries">
            My Deliveries
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <a href={getCarrierPortalHref(location.pathname)}>
            <Button variant="ghost">Carrier View</Button>
          </a>
          {isAuthenticated ? (
            <>
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
