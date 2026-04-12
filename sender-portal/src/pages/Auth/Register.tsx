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
import { registerSchema } from '../../validators/forms';

type RegisterValues = {
  name: string;
  email: string;
  phone: string;
  otp: string;
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', otp: '' }
  });

  const sendOtpMutation = useMutation({
    mutationFn: (phone: string) => authApi.sendOtp(phone),
    onSuccess: () => {
      trackFunnelStep('sender_activation', 'signup_otp_requested');
      toast.success('OTP sent successfully');
    },
    onError: (error) => {
      captureClientError(error, { source: 'sender_register_send_otp' });
    }
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterValues) => authApi.register(payload),
    onSuccess: (response) => {
      trackFunnelStep('sender_activation', 'signup_completed');
      setAuth(response.data.data);
      toast.success('Account created');
      navigate('/dashboard');
    },
    onError: (error) => {
      captureClientError(error, { source: 'sender_register_submit' });
    }
  });

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Create Account</h1>

        <form className="space-y-3" onSubmit={handleSubmit((values) => registerMutation.mutate(values))}>
          <Input label="Full Name" {...register('name')} error={errors.name?.message} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Phone" {...register('phone')} error={errors.phone?.message} />
          <Button type="button" variant="ghost" onClick={() => sendOtpMutation.mutate(watch('phone'))}>
            Send OTP
          </Button>
          <Input label="OTP" {...register('otp')} error={errors.otp?.message} />
          <Button type="submit" fullWidth>
            Register
          </Button>
        </form>

        <p className="text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-semibold text-primary">
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
