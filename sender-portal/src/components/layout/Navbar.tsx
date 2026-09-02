import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, PackageCheck, ShieldCheck, Wallet, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { getCarrierPortalHref } from '../../utils/portal';

const navItems = [
  { label: 'Send Package', to: '/send-package' },
  { label: 'Browse Carriers', to: '/browse-carriers' },
  { label: '📦 My Shipments & Tracking', to: '/shipments' }
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
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border border-zinc-200">Sender</span>
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
          <a href={getCarrierPortalHref(location.pathname)}>
            <Button variant="ghost" size="sm" className="text-xs">
              Switch to Carrier
            </Button>
          </a>
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/wallet')} className="text-xs">
                <Wallet className="h-3.5 w-3.5" />
                Wallet
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-xs">
                <PackageCheck className="h-3.5 w-3.5" />
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/70">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold text-zinc-500 sm:px-6 lg:px-8">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Verified travelers, OTP-secured handoff, and escrow-backed payouts</span>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-zinc-200/80 bg-white px-4 py-4 md:hidden animate-in slide-in-from-top-2 duration-150 shadow-xl">
          <div className="flex flex-col gap-3">
            {isAuthenticated ? (
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200/80 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{user?.name || 'Sender User'}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">₹{(user?.wallet?.balance || 0).toLocaleString('en-IN')} wallet</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearAuth();
                    setMenuOpen(false);
                    navigate('/');
                  }}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-3 w-3" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/auth/login');
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/auth/register');
                  }}
                >
                  Register
                </Button>
              </div>
            )}

            <nav className="flex flex-col gap-1 pt-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      isActive ? 'bg-zinc-950 text-white' : 'text-zinc-700 bg-zinc-50 hover:bg-zinc-100'
                    }`
                  }
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item.label}</span>
                  <span className="text-zinc-400 text-[10px]">→</span>
                </NavLink>
              ))}
            </nav>

            <div className="pt-2 border-t border-zinc-100">
              <a
                href={getCarrierPortalHref(location.pathname)}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                <span>Switch to Carrier Portal</span>
                <span className="text-zinc-400">→</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
