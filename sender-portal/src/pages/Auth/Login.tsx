import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { captureClientError, trackFunnelStep } from 'hopdrop-shared';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';
import { loginSchema } from '../../validators/forms';

type LoginValues = { phone: string; otp: string };
type Step = 'phone' | 'otp';

const ROUTES = [
  { from: 'Mumbai', to: 'Pune' },
  { from: 'Delhi', to: 'Agra' },
  { from: 'Hyderabad', to: 'Bengaluru' },
  { from: 'Chennai', to: 'Coimbatore' },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.347 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M13.187 9.49c-.013-1.61.714-2.831 2.175-3.727-.824-1.176-2.066-1.826-3.712-1.95-1.559-.12-3.264.913-3.888.913-.659 0-2.152-.867-3.396-.867C2.09 3.89 0 5.593 0 9.104c0 1.04.19 2.114.57 3.222.507 1.45 2.336 5.004 4.24 4.947 1.177-.028 2.007-.839 3.537-.839 1.485 0 2.25.839 3.578.839 1.921-.028 3.578-3.26 4.073-4.715-.013 0-2.811-1.07-2.811-4.068zm-2.62-7.47C11.622.966 12.254 0 12.254 0c-1.543.101-2.81 1.074-2.944 2.02h.026c.452-.009 1.23-.375 1.23 0z"/>
    </svg>
  );
}

function RoutePulse({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-3 text-white/60 text-sm font-medium">
      <span>{from}</span>
      <div className="flex-1 relative h-px bg-white/20 min-w-[60px]">
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"
          animate={{ left: ['0%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <span>{to}</span>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', otp: '' }
  });

  const sendOtpMutation = useMutation({
    mutationFn: (p: string) => authApi.sendOtp(p),
    onSuccess: () => {
      trackFunnelStep('sender_activation', 'login_otp_requested');
      toast.success('OTP sent');
      setStep('otp');
    },
    onError: (error) => captureClientError(error, { source: 'sender_login_send_otp' })
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginValues) => authApi.login(payload),
    onSuccess: (response) => {
      trackFunnelStep('sender_activation', 'login_completed');
      setAuth(response.data.data);
      toast.success('Welcome back');
      navigate('/dashboard');
    },
    onError: (error) => captureClientError(error, { source: 'sender_login_submit' })
  });

  const handleGoogle = () => toast('Google login coming soon — set VITE_GOOGLE_CLIENT_ID to enable', { icon: '🔑' });
  const handleApple = () => toast('Apple Sign-In coming soon', { icon: '🍎' });

  const handleSendOtp = () => {
    const p = watch('phone');
    setPhone(p);
    sendOtpMutation.mutate(p);
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT — dark brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#09090b] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <span className="text-white text-2xl font-bold tracking-tight">Hitch</span>
          <span className="ml-2 text-white/30 text-sm">by HopDrop</span>
        </motion.div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="text-white text-4xl font-bold leading-tight tracking-tight">
              Your package rides<br />
              <span className="text-white/50">with real travelers.</span>
            </h2>
            <p className="mt-4 text-white/40 text-base leading-relaxed max-w-sm">
              Same-day intercity delivery. No logistics company. Just people going the same way.
            </p>
          </motion.div>

          {/* Live route pulses */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 py-6 border-t border-white/10"
          >
            <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Active routes now</p>
            {ROUTES.map((r) => (
              <RoutePulse key={r.from} from={r.from} to={r.to} />
            ))}
          </motion.div>

          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/[0.05] border border-white/10 rounded-xl p-4"
          >
            <p className="text-white/80 text-sm font-medium">"Got my documents from Hyderabad in 4 hours. Cheaper than any courier."</p>
            <p className="text-white/30 text-xs mt-2">— Rahul M., sender</p>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 text-white/20 text-xs"
        >
          © 2025 HopDrop Technologies
        </motion.p>
      </div>

      {/* RIGHT — auth panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <span className="text-2xl font-bold tracking-tight text-[#09090b]">Hitch</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-[#09090b] tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-[#64748b]">Send your first package today</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-3"
          >
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm font-medium text-[#09090b] hover:bg-[#f8fafc] transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={handleApple}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm font-medium text-[#09090b] hover:bg-[#f8fafc] transition-colors"
            >
              <AppleIcon />
              Continue with Apple
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e2e8f0]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-[#94a3b8]">or use phone number</span>
              </div>
            </div>
          </motion.div>

          {/* Phone/OTP form */}
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5 uppercase tracking-wide">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#09090b] bg-white placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#09090b]/20 focus:border-[#09090b] transition"
                    {...register('phone')}
                  />
                  {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>}
                </div>
                <button
                  type="button"
                  disabled={sendOtpMutation.isPending}
                  onClick={handleSendOtp}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#09090b] text-white text-sm font-semibold hover:bg-[#18181b] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {sendOtpMutation.isPending ? 'Sending…' : 'Send OTP →'}
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit((values) => loginMutation.mutate({ ...values, phone }))}
                className="space-y-4"
              >
                <input type="hidden" {...register('phone')} value={phone} />
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#374151] uppercase tracking-wide">OTP sent to {phone}</label>
                    <button type="button" onClick={() => setStep('phone')} className="text-xs text-[#09090b] hover:underline">
                      Change
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="6-digit OTP"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#09090b] bg-white placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#09090b]/20 focus:border-[#09090b] transition tracking-[0.3em] text-center font-mono"
                    {...register('otp')}
                  />
                  {errors.otp && <p className="mt-1.5 text-xs text-red-500 text-center">{errors.otp.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#09090b] text-white text-sm font-semibold hover:bg-[#18181b] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loginMutation.isPending ? 'Verifying…' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => sendOtpMutation.mutate(phone)}
                  className="w-full text-xs text-[#64748b] hover:text-[#09090b] transition-colors"
                >
                  Resend OTP
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-[#64748b]"
          >
            No account?{' '}
            <Link to="/auth/register" className="font-semibold text-[#09090b] hover:underline">
              Sign up
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
