import { useEffect, useState } from 'react';
import { useTransactions } from '../hooks/useMoney';
import { formatTaka, formatDate, getStatusBadgeClass } from '../utils/format';
import { Card, Badge, Input } from '../components/UI';

export default function Transactions() {
  const { getTransactions, loading } = useTransactions();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    loadTransactions(true);
  }, [filter]);

  const loadTransactions = async (reset = false) => {
    const offset = reset ? 0 : page * pageSize;
    try {
      const { transactions: newTx } = await getTransactions({ type: filter === 'all' ? undefined : filter, limit: pageSize, offset });
      if (reset) setTransactions(newTx);
      else setTransactions(prev => [...prev, ...newTx]);
      setHasMore(newTx.length === pageSize);
      if (reset) setPage(0);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(p => p + 1);
      loadTransactions();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-500 mt-1">View all your transactions</p>
      </div>

      <Card>
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'incoming', 'outgoing'].map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); }}
              className={`px-3 py-1 rounded-full text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No transactions found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 font-medium text-gray-500">Date</th>
                    <th className="pb-2 font-medium text-gray-500">Type</th>
                    <th className="pb-2 font-medium text-gray-500">Amount</th>
                    <th className="pb-2 font-medium text-gray-500">Balance After</th>
                    <th className="pb-2 font-medium text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                      <td className="py-3">
                        <Badge variant={tx.type === 'CREDIT' ? 'approved' : 'rejected'}>{tx.type}</Badge>
                      </td>
                      <td className={`py-3 font-medium ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{formatTaka(tx.amount * 100)}
                      </td>
                      <td className="py-3 text-gray-900">{formatTaka(tx.balanceAfter * 100)}</td>
                      <td className="py-3 text-gray-600">{tx.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <Button variant="secondary" onClick={loadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}