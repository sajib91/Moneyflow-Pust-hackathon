import { useEffect, useState } from 'react';
import { useTransfers } from '../hooks/useMoney';
import { formatTaka } from '../utils/format';
import { Card } from '../components/UI';

export default function Dashboard() {
  const { getBalance, loading, error } = useTransfers();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    getBalance().then(setBalance).catch(console.error);
  }, [getBalance]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your account</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Balance</h2>
          {loading ? (
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
          ) : error ? (
            <div className="text-red-600">Failed to load balance</div>
          ) : (
            <div className="text-4xl font-bold text-gray-900">{formatTaka(balance?.balance * 100)}</div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/send" className="btn-primary w-full text-center">Send Money</a>
            <a href="/requests" className="btn-secondary w-full text-center">Request Money</a>
            <a href="/transactions" className="btn-secondary w-full text-center">View History</a>
          </div>
        </Card>
      </div>
    </div>
  );
}