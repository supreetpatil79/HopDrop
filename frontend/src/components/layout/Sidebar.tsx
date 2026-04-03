import { Link } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside className="hidden w-64 border-r border-border bg-white p-4 lg:block">
      <nav className="space-y-2 text-sm">
        <Link to="/dashboard" className="block rounded px-2 py-1 hover:bg-surface-alt">Dashboard</Link>
        <Link to="/my-trips" className="block rounded px-2 py-1 hover:bg-surface-alt">My Trips</Link>
        <Link to="/my-deliveries" className="block rounded px-2 py-1 hover:bg-surface-alt">My Deliveries</Link>
      </nav>
    </aside>
  );
}
