import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, Truck, Wallet, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { getSenderPortalHref } from '../../utils/portal';

const navItems = [
  { label: 'Post Trip', to: '/post-trip' },
  { label: 'Incoming Requests', to: '/incoming-requests' },
  { label: 'My Trips', to: '/my-trips' },
  { label: '🛡️ Verification & Setup', to: '/setup' }
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-all duration-150',
    isActive ? 'bg-zinc-950 text-white shadow-xs' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
  ].join(' ');
}

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, clearAuth } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-xs font-bold tracking-wider text-white shadow-xs">
            HD
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-zinc-950">HopDrop</span>
              <span className="rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Carrier</span>
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-xl border border-zinc-200/70 bg-zinc-50 p-1 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} className={navLinkClass} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href={getSenderPortalHref(location.pathname)}>
            <Button variant="ghost" size="sm" className="text-xs">
              Switch to Sender
            </Button>
          </a>
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/earnings')} className="text-xs">
                <Wallet className="h-3.5 w-3.5" />
                Earnings
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-xs">
                <Truck className="h-3.5 w-3.5" />
                {user?.name?.split(' ')[0] || 'Profile'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  clearAuth();
                  navigate('/');
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth/login')} className="text-xs">
                Login
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/auth/register')} className="text-xs">
                Register
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-white/85 text-text shadow-[0_10px_20px_-18px_rgba(15,23,42,0.5)] transition hover:border-primary/25 hover:text-primary md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="border-t border-border/60 bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:px-6 lg:px-8">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Verified routes, secure OTP pickup, and payout-ready delivery operations
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-border/70 bg-white/95 px-4 py-4 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.45)] md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink key={item.to} className={navLinkClass} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-col gap-2">
              <a href={getSenderPortalHref(location.pathname)}>
                <Button variant="ghost" fullWidth>
                  Sender View
                </Button>
              </a>
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" fullWidth onClick={() => navigate('/earnings')}>
                    <Wallet className="h-4 w-4" />
                    Earnings
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => navigate('/profile')}>
                    <Truck className="h-4 w-4" />
                    {user?.name?.split(' ')[0] || 'Profile'}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      clearAuth();
                      navigate('/');
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" fullWidth onClick={() => navigate('/auth/login')}>
                    Login
                  </Button>
                  <Button fullWidth onClick={() => navigate('/auth/register')}>
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
