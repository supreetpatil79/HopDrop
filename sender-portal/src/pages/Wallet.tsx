import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RazorpayButton } from '../components/ui/RazorpayButton';
import { formatDateTime, formatINRPaise } from '../utils/format';
import toast from 'react-hot-toast';

export default function Wallet() {
  const queryClient = useQueryClient();
  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: () => userApi.wallet().then((r) => r.data.data) });
  const wallet = walletQuery.data;
  const [depositAmount, setDepositAmount] = useState<number>(500); // INR

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Wallet & Escrow</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 bg-white border border-zinc-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Available Balance</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">{formatINRPaise(wallet?.balance)}</p>
          <Button variant="secondary" size="sm" className="mt-4 w-full">Withdraw</Button>
        </Card>

        <Card className="p-5 bg-white border border-zinc-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Escrow Held</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{formatINRPaise(wallet?.escrowHeld)}</p>
          <p className="mt-2 text-xs text-zinc-500">Locked in dual-OTP smart escrow until package delivery verification.</p>
        </Card>

        <Card className="p-5 bg-zinc-900 text-white border border-zinc-800 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quick Deposit</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-400">₹</span>
              <input
                type="number"
                min="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Math.max(1, Number(e.target.value)))}
                className="w-24 rounded-lg bg-zinc-800 px-2.5 py-1 text-lg font-bold text-white border border-zinc-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Razorpay Standard Checkout</p>
          </div>
          <div className="mt-4">
            <RazorpayButton
              amount={depositAmount * 100} // paise
              label={`Add ₹${depositAmount}`}
              description={`Wallet Top-up: ₹${depositAmount}`}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-2.5 px-4 text-xs tracking-wide transition shadow-lg flex items-center justify-center gap-1.5"
              onSuccess={() => {
                toast.success(`Successfully added ₹${depositAmount} to your wallet!`);
                queryClient.invalidateQueries({ queryKey: ['wallet'] });
              }}
            />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Transaction History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(wallet?.transactions || []).map((tx: any) => (
                <tr key={tx._id} className="border-b border-border/70">
                  <td className="px-2 py-2">{formatDateTime(tx.createdAt)}</td>
                  <td className="px-2 py-2">{tx.type}</td>
                  <td className="px-2 py-2">{formatINRPaise(tx.amount)}</td>
                  <td className="px-2 py-2">{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
