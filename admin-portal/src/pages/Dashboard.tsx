import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Users, Package, Truck, ArrowRightLeft, TrendingUp, Clock, Zap } from 'lucide-react';
import { fetchAll } from '../api/analytics';

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  delay = 0
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-xl border border-[#e2e8f0] p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[#f8fafc] flex items-center justify-center">
          <Icon size={16} className="text-[#09090b]" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-[#09090b] tracking-tight">{value}</div>
        {sub && <div className="text-xs text-[#64748b] mt-0.5">{sub}</div>}
      </div>
      {trend && (
        <div className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md px-2 py-1 inline-block">
          {trend}
        </div>
      )}
    </motion.div>
  );
}

const FUNNEL_COLORS = ['#09090b', '#27272a', '#3f3f46', '#52525b', '#71717a', '#a1a1aa'];

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAll,
    refetchInterval: 30_000 // auto-refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#64748b] text-sm">Loading analytics…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-red-500 text-sm">Failed to load analytics. Check VITE_INTERNAL_API_TOKEN.</div>
        <button onClick={() => refetch()} className="text-xs text-[#09090b] border border-[#e2e8f0] rounded-lg px-3 py-1.5 hover:bg-[#f8fafc]">
          Retry
        </button>
      </div>
    );
  }

  const { summary, funnel, dwell, trend } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#09090b] tracking-tight">Analytics</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Live data · refreshes every 30s</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs font-medium text-[#09090b] border border-[#e2e8f0] rounded-lg px-3 py-2 hover:bg-[#f8fafc] flex items-center gap-2 transition"
        >
          <Zap size={12} />
          Refresh
        </button>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={summary.users.total.toLocaleString()} sub={`+${summary.users.d7} this week`} icon={Users} delay={0} trend={`+${summary.users.d1} today`} />
        <MetricCard label="Total Trips" value={summary.trips.total.toLocaleString()} sub={`${summary.trips.active} active`} icon={Truck} delay={0.05} />
        <MetricCard label="Deliveries" value={summary.deliveries.total.toLocaleString()} sub={`${summary.deliveries.pending} pending`} icon={Package} delay={0.1} />
        <MetricCard label="Match Rate" value={`${summary.conversionRate}%`} sub={`${summary.matches.completed} completed`} icon={ArrowRightLeft} delay={0.15} trend={`${summary.matches.active} in-flight`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Signup trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-[#e2e8f0] p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-[#09090b]" />
            <h2 className="text-sm font-semibold text-[#09090b]">New signups — 30 days</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#09090b" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#09090b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#64748b' }}
              />
              <Area type="monotone" dataKey="signups" stroke="#09090b" strokeWidth={2} fill="url(#signupGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Match funnel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-[#e2e8f0] p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <ArrowRightLeft size={16} className="text-[#09090b]" />
            <h2 className="text-sm font-semibold text-[#09090b]">Match funnel</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={120} />
              <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {funnel.map((_entry, index) => (
                  <Cell key={index} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Dwell time table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden"
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#f1f5f9]">
          <Clock size={16} className="text-[#09090b]" />
          <h2 className="text-sm font-semibold text-[#09090b]">Avg dwell time by page</h2>
          <span className="ml-auto text-xs text-[#94a3b8]">tracked via beacon</span>
        </div>
        {dwell.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#94a3b8] text-center">No dwell data yet — beacon fires on page unload</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Page</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Avg Dwell</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Sessions</th>
                <th className="px-6 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {dwell.map((row, i) => {
                const max = dwell[0]?.avgDwellSec || 1;
                const pct = (row.avgDwellSec / max) * 100;
                return (
                  <tr key={row.page} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-6 py-3 font-medium text-[#09090b]">
                      <span className="text-[#94a3b8] mr-2 text-xs">{i + 1}</span>
                      {row.page}
                    </td>
                    <td className="px-6 py-3 text-right text-[#09090b] font-mono text-xs">
                      {row.avgDwellSec >= 60
                        ? `${Math.floor(row.avgDwellSec / 60)}m ${row.avgDwellSec % 60}s`
                        : `${row.avgDwellSec}s`}
                    </td>
                    <td className="px-6 py-3 text-right text-[#64748b] text-xs">{row.sessions.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#09090b] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* User cohorts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: 'New users today', value: summary.users.d1, sub: 'D1' },
          { label: 'New users this week', value: summary.users.d7, sub: 'D7' },
          { label: 'New users this month', value: summary.users.d30, sub: 'D30' },
        ].map(({ label, value, sub }) => (
          <div key={sub} className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">{label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#09090b]">{value.toLocaleString()}</span>
              <span className="text-xs text-[#94a3b8]">{sub}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
