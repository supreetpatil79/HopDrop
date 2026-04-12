import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface OTPVerifyProps {
  value: string;
  onChange: (value: string) => void;
  onVerify: () => void;
  label: string;
}

export function OTPVerify({ value, onChange, onVerify, label }: OTPVerifyProps) {
  return (
    <div className="space-y-2">
      <Input label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      <Button onClick={onVerify}>Verify OTP</Button>
    </div>
  );
}
