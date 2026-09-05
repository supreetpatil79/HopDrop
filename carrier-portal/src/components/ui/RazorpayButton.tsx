import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayButtonProps {
  label?: string;
  amount: number; // In paise (minimum 100 paise)
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (paymentId: string, orderId: string, signature: string) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
  createOrderFn?: () => Promise<{ order_id?: string; orderId?: string; id?: string; amount?: number; currency?: string }>;
  children?: React.ReactNode;
}

export function RazorpayButton({
  label = 'Pay Now',
  amount,
  currency = 'INR',
  name = 'HopDrop',
  description,
  prefill,
  themeColor = '#00C853',
  className,
  disabled = false,
  onSuccess,
  onFailure,
  onDismiss,
  createOrderFn,
  children
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (amount < 100) {
      toast.error('Amount must be at least ₹1 (100 paise)');
      return;
    }

    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded && !(window as any).Razorpay) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      // Step 1: Create Order (via custom createOrderFn or standard /payments/create-order API)
      let orderId = '';
      if (createOrderFn) {
        const orderData = await createOrderFn();
        orderId = orderData.order_id || orderData.orderId || orderData.id || '';
      } else {
        const res = await api.post('/payments/create-order', {
          amount,
          currency,
          receipt: `rcpt_${Date.now()}`
        });
        const data = res.data?.data || res.data;
        orderId = data.order_id || data.orderId || data.id || '';
      }

      if (!orderId) {
        throw new Error('Could not obtain an Order ID from server');
      }

      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        console.warn('VITE_RAZORPAY_KEY_ID is not configured in client environment');
      }

      // Step 2: Open Razorpay Standard Checkout modal
      const options = {
        key: key || 'rzp_test_TYDZYXs2HY5trs',
        amount,
        currency,
        name,
        description: description || label,
        order_id: orderId,
        prefill: prefill || {},
        theme: { color: themeColor },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Step 3: Verify Payment Signature with backend
            const verifyRes = await api.post('/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data?.success !== false) {
              toast.success('Payment verified successfully!');
              onSuccess?.(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );
            } else {
              throw new Error(verifyRes.data?.error || 'Signature verification failed');
            }
          } catch (err: any) {
            const errorMsg = err?.response?.data?.error || err?.message || 'Payment verification failed';
            toast.error(errorMsg);
            onFailure?.(err);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast('Payment cancelled by user', { icon: 'ℹ️' });
            onDismiss?.();
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);

      // Handle payment failure events
      rzp.on('payment.failed', (response: any) => {
        setLoading(false);
        const reason = response.error?.description || response.error?.reason || 'Transaction could not be completed';
        toast.error(`Payment failed: ${reason}`);
        onFailure?.(response.error);
      });

      rzp.open();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Payment setup failed. Please retry.';
      toast.error(msg);
      onFailure?.(error);
      setLoading(false);
    }
  };

  const defaultClassName = `w-full rounded-xl px-4 py-4 text-base font-bold transition flex items-center justify-center gap-2 ${
    loading || disabled
      ? 'cursor-wait bg-zinc-800 text-zinc-400'
      : 'bg-primary text-black hover:opacity-90 shadow-md active:scale-[0.99]'
  }`;

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={loading || disabled}
      className={className || defaultClassName}
    >
      {loading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span>Setting up secure payment...</span>
        </>
      ) : (
        children || `🔐 ${label}`
      )}
    </button>
  );
}
