import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function OTPVerify({
  label,
  onVerify
}: {
  label: string;
  onVerify: (otp: string) => Promise<void> | void;
}) {
  const [otp, setOtp] = useState('');

  return (
    <div className="space-y-2">
      <Input label={label} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" />
      <Button onClick={() => onVerify(otp)}>Verify OTP</Button>
    </div>
  );
}
