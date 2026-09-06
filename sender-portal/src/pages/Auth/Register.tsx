import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { captureClientError, trackFunnelStep } from 'hopdrop-shared';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';
import { registerSchema } from '../../validators/forms';

type RegisterValues = { name: string; email: string; phone: string; otp: string };

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', otp: '' }
  });

  const sendOtpMutation = useMutation({
    mutationFn: (phone: string) => authApi.sendOtp(phone),
    onSuccess: () => { trackFunnelStep('sender_activation', 'signup_otp_requested'); toast.success('OTP sent'); },
    onError: (error) => captureClientError(error, { source: 'sender_register_send_otp' })
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterValues) => authApi.register(payload),
    onSuccess: (response) => {
      trackFunnelStep('sender_activation', 'signup_completed');
      setAuth(response.data.data);
      toast.success('Account created');
      navigate('/dashboard');
    },
    onError: (error) => captureClientError(error, { source: 'sender_register_submit' })
  });

  return (
    <div className="min-h-screen flex">
      {/* LEFT — brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#09090b] flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
          <span className="text-white text-2xl font-bold tracking-tight">Hitch</span>
          <span className="ml-2 text-white/30 text-sm">by HopDrop</span>
        </motion.div>

        <div className="relative z-10 space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-4xl font-bold leading-tight tracking-tight"
          >
            Send anything,<br />
            <span className="text-white/50">anywhere in India.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/40 text-base leading-relaxed max-w-sm"
          >
            Create an account in 30 seconds. Your first delivery matched in minutes.
          </motion.p>

          {/* Steps */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3 pt-4 border-t border-white/10"
          >
            {['Enter your details', 'Post your delivery', 'Carrier picks it up'].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">{i + 1}</span>
                <span className="text-white/60 text-sm">{s}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="relative z-10 text-white/20 text-xs">© 2025 HopDrop Technologies</p>
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <span className="text-2xl font-bold tracking-tight text-[#09090b]">Hitch</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-2xl font-bold text-[#09090b] tracking-tight">Create account</h1>
            <p className="mt-1 text-sm text-[#64748b]">Free, takes 30 seconds</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit((values) => registerMutation.mutate(values))}
            className="space-y-4"
          >
            {[
              { label: 'Full name', key: 'name', type: 'text', placeholder: 'Priya Nair' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'priya@email.com' },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: '9876543210' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-[#374151] mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#09090b] bg-white placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#09090b]/20 focus:border-[#09090b] transition"
                  {...register(key as keyof RegisterValues)}
                />
                {errors[key as keyof RegisterValues] && (
                  <p className="mt-1.5 text-xs text-red-500">{errors[key as keyof RegisterValues]?.message}</p>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => sendOtpMutation.mutate(watch('phone'))}
                disabled={sendOtpMutation.isPending}
                className="flex-shrink-0 px-4 py-2.5 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#09090b] hover:bg-[#f8fafc] transition whitespace-nowrap disabled:opacity-50"
              >
                {sendOtpMutation.isPending ? '…' : 'Send OTP'}
              </button>
              <input
                type="text"
                placeholder="6-digit OTP"
                maxLength={6}
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#09090b] bg-white placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#09090b]/20 focus:border-[#09090b] transition tracking-widest font-mono text-center"
                {...register('otp')}
              />
            </div>
            {errors.otp && <p className="text-xs text-red-500">{errors.otp.message}</p>}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full py-2.5 px-4 rounded-lg bg-[#09090b] text-white text-sm font-semibold hover:bg-[#18181b] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {registerMutation.isPending ? 'Creating…' : 'Create account →'}
            </button>
          </motion.form>

          <p className="mt-6 text-center text-sm text-[#64748b]">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold text-[#09090b] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
