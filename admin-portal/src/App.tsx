import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import './index.css';

const qc = new QueryClient();
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN ?? 'hitchadmin2024';

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-[#e2e8f0] p-10 w-full max-w-sm shadow-sm"
      >
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-[#09090b]">Hitch</span>
          <span className="ml-1.5 text-[#64748b] text-sm">Admin</span>
          <p className="mt-2 text-xs text-[#94a3b8]">Enter admin PIN to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <motion.input
            animate={error ? { x: [-6, 6, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            type="password"
            placeholder="••••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 transition ${
              error
                ? 'border-red-300 ring-red-200 bg-red-50'
                : 'border-[#e2e8f0] focus:ring-[#09090b]/20 focus:border-[#09090b]'
            }`}
          />
          {error && (
            <p className="text-xs text-red-500 text-center">Wrong PIN</p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#09090b] text-white text-sm font-semibold hover:bg-[#18181b] transition active:scale-[0.98]"
          >
            Unlock
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function Sidebar({ active, setActive }: { active: string; setActive: (v: string) => void }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
  ];

  return (
    <aside className="w-52 shrink-0 bg-white border-r border-[#e2e8f0] min-h-screen p-4 flex flex-col gap-1">
      <div className="px-3 py-4 mb-2">
        <span className="text-lg font-bold tracking-tight text-[#09090b]">Hitch</span>
        <span className="ml-1.5 text-[#64748b] text-xs">Admin</span>
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActive(item.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
            active === item.id
              ? 'bg-[#09090b] text-white'
              : 'text-[#374151] hover:bg-[#f8fafc]'
          }`}
        >
          {item.label}
        </button>
      ))}

      <div className="mt-auto pt-4 border-t border-[#f1f5f9]">
        <div className="px-3 py-2 text-xs text-[#94a3b8]">
          <div className="font-medium text-[#09090b] text-sm mb-0.5">Supreet Patil</div>
          Admin
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [active, setActive] = useState('dashboard');

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <QueryClientProvider client={qc}>
      <div className="flex min-h-screen bg-[#f8fafc]">
        <Sidebar active={active} setActive={setActive} />
        <main className="flex-1 p-8 overflow-auto">
          <AnimatePresence mode="wait">
            {active === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Dashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </QueryClientProvider>
  );
}
