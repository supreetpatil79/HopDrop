import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, MapPin, Package, ShieldCheck, Truck, Wallet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { getSenderPortalHref } from '../../utils/portal';

const navItems = [
  { label: 'Post Trip', to: '/post-trip', icon: MapPin },
  { label: 'Requests', to: '/incoming-requests', icon: Package },
  { label: 'My Trips', to: '/my-trips', icon: Truck },
  { label: 'Setup', to: '/setup', icon: ShieldCheck },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, clearAuth } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_0_0_rgba(232,230,225,1)]'
                 : 'bg-[#FAFAF8]/80 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] shadow-[0_2px_8px_rgba(37,99,235,0.35)] transition-all group-hover:shadow-[0_4px_12px_rgba(37,99,235,0.45)]">
            <span className="text-[11px] font-black tracking-widest text-white">H</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold tracking-tight text-warm-900">Hitch</span>
            <span className="rounded-md bg-[#2563EB] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
              Carrier
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium tracking-tight transition-all duration-150 ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.30)]'
                    : 'text-warm-600 hover:bg-warm-100 hover:text-warm-900'
                }`
              }
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <a href={getSenderPortalHref(location.pathname)}>
            <button type="button" className="rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-[12px] font-medium text-warm-600 shadow-card transition hover:border-warm-300 hover:text-warm-900">
              Sender Portal ↗
            </button>
          </a>

          {isAuthenticated ? (
            <>
              <button type="button" onClick={() => navigate('/earnings')} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-warm-600 transition hover:bg-warm-100 hover:text-warm-900">
                <Wallet className="h-3.5 w-3.5" /> Earnings
              </button>
              <button type="button" onClick={() => navigate('/profile')} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white shadow-[0_2px_6px_rgba(37,99,235,0.35)] transition hover:shadow-[0_4px_12px_rgba(37,99,235,0.40)]">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </button>
              <button type="button" onClick={() => { clearAuth(); navigate('/'); }} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-warm-500 transition hover:bg-rose-50 hover:text-rose-600">
                <LogOut className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => navigate('/auth/login')} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-warm-600 transition hover:text-warm-900">
                Sign in
              </button>
              <button type="button" onClick={() => navigate('/auth/register')} className="rounded-lg bg-[#2563EB] px-4 py-1.5 text-[12px] font-semibold text-white shadow-[0_2px_8px_rgba(37,99,235,0.35)] transition hover:bg-[#1D4ED8] active:scale-[0.98]">
                Become a carrier →
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-warm-200 bg-white text-warm-700 transition hover:bg-warm-100 md:hidden">
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-warm-200 bg-white px-4 md:hidden"
          >
            <div className="flex flex-col gap-1 py-4">
              {isAuthenticated && (
                <div className="flex items-center gap-3 rounded-xl bg-warm-50 border border-warm-200 p-3 mb-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-warm-900 truncate">{user?.name || 'Carrier'}</p>
                    <p className="text-[11px] text-warm-500">Verified carrier</p>
                  </div>
                </div>
              )}

              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? 'bg-[#2563EB] text-white' : 'text-warm-700 hover:bg-warm-50'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}

              <div className="mt-2 pt-3 border-t border-warm-100 flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <button type="button" onClick={() => { setMenuOpen(false); navigate('/earnings'); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-warm-700 hover:bg-warm-50 transition">
                      <Wallet className="h-4 w-4" /> Earnings
                    </button>
                    <button type="button" onClick={() => { clearAuth(); setMenuOpen(false); navigate('/'); }} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 transition">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setMenuOpen(false); navigate('/auth/login'); }} className="rounded-xl border border-warm-200 py-2.5 text-sm font-medium text-warm-700 hover:bg-warm-50">
                      Sign in
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); navigate('/auth/register'); }} className="rounded-xl bg-[#2563EB] py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8]">
                      Get started
                    </button>
                  </div>
                )}
                <a href={getSenderPortalHref(location.pathname)} className="flex items-center justify-between rounded-xl border border-warm-200 px-4 py-3 text-sm font-medium text-warm-600 hover:bg-warm-50">
                  <span>Switch to Sender</span>
                  <span className="text-warm-400">↗</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
