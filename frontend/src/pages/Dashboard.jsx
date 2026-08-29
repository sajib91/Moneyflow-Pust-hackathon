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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your account</p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Balance Card */}
        <Card className="md:col-span-2 p-6 flex flex-col justify-between border border-gray-100 shadow-sm rounded-xl bg-white">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-500">Current Balance</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                Active Account
              </span>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="h-12 w-48 bg-gray-100 rounded-lg animate-pulse" />
              ) : error ? (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  Failed to load balance
                </div>
              ) : (
                <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {formatTaka(balance?.balance * 100)}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card className="p-6 border border-gray-100 shadow-sm rounded-xl bg-white">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/send"
              className="btn-primary w-full text-center block px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
            >
              Send Money
            </a>
            <a
              href="/requests"
              className="btn-secondary w-full text-center block px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium text-sm rounded-lg transition-colors"
            >
              Request Money
            </a>
            <a
              href="/transactions"
              className="btn-secondary w-full text-center block px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-medium text-sm rounded-lg transition-colors"
            >
              View History
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}