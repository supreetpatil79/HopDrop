export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/70 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.14em] text-dark">HopDrop Carrier</p>
          <p className="max-w-xl text-sm leading-6 text-text-muted">
            Manage trusted package matches, secure pickup OTPs, and payout-ready trips from one operational workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">Verified lanes</span>
          <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">OTP handoff</span>
          <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">Secure payouts</span>
        </div>
      </div>
    </footer>
  );
}
