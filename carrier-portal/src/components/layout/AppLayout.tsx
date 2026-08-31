import { PropsWithChildren } from 'react';
import { ConnectionStatusBar } from './ConnectionStatusBar';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen text-text">
      <Navbar />
      <ConnectionStatusBar />
      <main className="page-shell">{children}</main>
      <Footer />
    </div>
  );
}
