import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { captureClientError, trackFunnelStep } from 'hopdrop-shared';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema } from '../../validators/forms';

type LoginValues = {
  phone: string;
  otp: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', otp: '' }
  });

  const sendOtpMutation = useMutation({
    mutationFn: (phone: string) => authApi.sendOtp(phone),
    onSuccess: () => {
      trackFunnelStep('sender_activation', 'login_otp_requested');
      toast.success('OTP sent successfully');
    },
    onError: (error) => {
      captureClientError(error, { source: 'sender_login_send_otp' });
    }
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginValues) => authApi.login(payload),
    onSuccess: (response) => {
      trackFunnelStep('sender_activation', 'login_completed');
      setAuth(response.data.data);
      toast.success('Welcome back');
      navigate('/dashboard');
    },
    onError: (error) => {
      captureClientError(error, { source: 'sender_login_submit' });
    }
  });

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>

        <form className="space-y-3" onSubmit={handleSubmit((values) => loginMutation.mutate(values))}>
          <Input label="Phone" placeholder="9876543210" {...register('phone')} error={errors.phone?.message} />
          <Button type="button" variant="ghost" onClick={() => sendOtpMutation.mutate(watch('phone'))}>
            Send OTP
          </Button>
          <Input label="OTP" placeholder="6-digit OTP" {...register('otp')} error={errors.otp?.message} />
          <Button type="submit" fullWidth>
            Login
          </Button>
        </form>

        <p className="text-sm text-text-muted">
          New to HopDrop?{' '}
          <Link to="/auth/register" className="font-semibold text-primary">
            Create account
          </Link>
        </p>
      </Card>
    </div>
  );
}
