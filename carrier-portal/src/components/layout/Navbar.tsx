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
          <span className="truncate">Verified routes, secure OTP pickup, and payout-ready delivery operations</span>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 top-[88px] z-50 bg-zinc-950/40 backdrop-blur-sm md:hidden animate-in fade-in duration-150">
          <div className="flex h-full w-full max-w-xs flex-col justify-between bg-white p-5 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-xs font-bold text-white">HD</div>
                  <div>
                    <p className="text-xs font-bold text-zinc-950">HopDrop Carrier</p>
                    <p className="text-[10px] text-zinc-400">Traveler Courier Network</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                        isActive ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                      }`
                    }
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="border-t border-zinc-100 pt-3">
                <a
                  href={getSenderPortalHref(location.pathname)}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
                >
                  <span>Switch to Sender</span>
                  <span className="text-zinc-400">→</span>
                </a>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700">
                        {user?.name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{user?.name || 'Carrier'}</p>
                        <p className="text-[10px] text-zinc-400">₹{(user?.wallet?.balance || 0).toLocaleString('en-IN')} earnings</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs justify-start"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/earnings');
                      }}
                    >
                      <Wallet className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                      Earnings
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs justify-start"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/profile');
                      }}
                    >
                      <Truck className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                      Profile
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-rose-600 justify-start hover:bg-rose-50"
                    onClick={() => {
                      clearAuth();
                      setMenuOpen(false);
                      navigate('/');
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
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
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
