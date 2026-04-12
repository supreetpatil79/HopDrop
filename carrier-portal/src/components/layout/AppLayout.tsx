import { PropsWithChildren } from 'react';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}
