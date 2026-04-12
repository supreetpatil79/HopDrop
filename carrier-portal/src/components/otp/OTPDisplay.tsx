export function OTPDisplay({ otp, title }: { otp: string; title: string }) {
  return (
    <div data-testid="otp-display" className="rounded-2xl border border-primary/40 bg-dark p-6 text-center">
      <p className="text-sm text-white/70">{title}</p>
      <p data-testid="otp-value" className="mt-2 text-5xl font-bold tracking-[0.6rem] text-primary">{otp}</p>
      <p className="mt-3 text-xs text-white/50">Show this OTP physically to the other person</p>
    </div>
  );
}
