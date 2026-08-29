import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTransfers } from '../hooks/useMoney';
import { UserSearch } from '../components/UserSearch';
import { formatTaka } from '../utils/format';
import { Input, Button, Card, Modal } from '../components/UI';

export default function SendMoney() {
  const { user } = useAuth();
  const { sendMoney, searchUsers, loading, error } = useTransfers();
  const [recipient, setRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSearch = async (query) => {
    return searchUsers(query);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) return;
    setSubmitError('');
    try {
      await sendMoney(recipient.id, parseInt(amount));
      setRecipient(null);
      setAmount('');
      setShowConfirm(false);
    } catch (err) {
      setSubmitError(err.data?.message || err.message);
    }
  };

  const handleConfirm = async () => {
    if (!recipient || !amount) return;
    setSubmitError('');
    try {
      await sendMoney(recipient.id, parseInt(amount));
      setRecipient(null);
      setAmount('');
      setShowConfirm(false);
    } catch (err) {
      setSubmitError(err.data?.message || err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Send Money</h1>
        <p className="text-gray-500 mt-1">Transfer money to another user</p>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="label">Recipient</label>
            <UserSearch
              onSelect={setRecipient}
              excludeId={user.id}
              placeholder="Search by name, email, or phone"
            />
            {recipient && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium">{recipient.name}</p>
                <p className="text-sm text-gray-500">{recipient.email} · {recipient.phone}</p>
              </div>
            )}
          </div>

          <Input
            label="Amount (BDT)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            required
            disabled={!recipient}
          />

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          {submitError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{submitError}</div>}

          <Button type="submit" className="w-full" disabled={!recipient || !amount || loading}>
            {loading ? 'Sending...' : 'Send Money'}
          </Button>
        </form>
      </Card>
    </div>
  );
}