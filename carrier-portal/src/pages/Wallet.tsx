import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDateTime, formatINRPaise } from '../utils/format';

export default function Wallet() {
  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: () => userApi.wallet().then((r) => r.data.data) });
  const wallet = walletQuery.data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-sm text-text-muted">Available Balance</p>
          <p className="mt-2 text-3xl font-bold text-dark">{formatINRPaise(wallet?.balance)}</p>
          <Button className="mt-3">Withdraw</Button>
        </Card>

        <Card>
          <p className="text-sm text-text-muted">Escrow Held</p>
          <p className="mt-2 text-3xl font-bold text-dark">{formatINRPaise(wallet?.escrowHeld)}</p>
          <p className="mt-2 text-sm text-text-muted">Held until delivery verification / dispute resolution.</p>
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
