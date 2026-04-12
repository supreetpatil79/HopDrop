import { useState } from 'react';
import toast from 'react-hot-toast';

interface RazorpayButtonProps {
  label: string;
  amount: number;
  onSuccess: (paymentId: string, orderId: string, signature: string) => void;
  createOrderFn: () => Promise<{ orderId: string; amount: number; currency: string }>;
}

export function RazorpayButton({ label, amount, onSuccess, createOrderFn }: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { orderId } = await createOrderFn();

      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!(window as any).Razorpay || !key) {
        onSuccess(`mock_pay_${Date.now()}`, orderId, 'mock_signature');
        setLoading(false);
        return;
      }

      const options = {
        key,
        amount,
        currency: 'INR',
        name: 'HopDrop',
        description: label,
        order_id: orderId,
        theme: { color: '#00C853' },
        handler: (response: any) => {
          onSuccess(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
          setLoading(false);
        },
        modal: {
          ondismiss: () => setLoading(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (_error) {
      toast.error('Payment setup failed. Please retry.');
      setLoading(false);
    }
  };

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" />
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className={`w-full rounded-xl px-4 py-4 text-base font-bold transition ${loading ? 'cursor-wait bg-[#2a2d35] text-white/40' : 'bg-primary text-black'}`}
      >
        {loading ? 'Setting up payment...' : `🔐 ${label}`}
      </button>
    </>
  );
}
