import { useEffect, useState } from 'react';
import { useRequests } from '../hooks/useMoney';
import UserSearch from '../components/UserSearch';
import { useAuth } from '../context/AuthContext';
import { formatTaka, getStatusBadgeClass } from '../utils/format';
import { Card, Badge, Modal, Button, Input } from '../components/UI';

export default function Requests() {
  const { user } = useAuth();
  const { createRequest, getRequests, getPendingRequests, approveRequest, rejectRequest, cancelRequest, loading } = useRequests();
  const [requests, setRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('sent');
  const [showCreate, setShowCreate] = useState(false);
  const [createRecipient, setCreateRecipient] = useState(null);
  const [createAmount, setCreateAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'pending') {
      const { requests } = await getPendingRequests();
      setPendingRequests(requests);
    } else {
      const { requests } = await getRequests();
      setRequests(requests);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!createRecipient || !createAmount) return;
    try {
      await createRequest(createRecipient.id, parseInt(createAmount));
      setShowCreate(false);
      setCreateRecipient(null);
      setCreateAmount('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAction = async (action, id) => {
    setActionLoading(true);
    try {
      if (action === 'approve') await approveRequest(id);
      else if (action === 'reject') await rejectRequest(id);
      else if (action === 'cancel') await cancelRequest(id);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = activeTab === 'sent'
    ? requests.filter(r => r.requester.id === user.id)
    : requests.filter(r => r.payer.id === user.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Money Requests</h1>
          <p className="text-gray-500 mt-1">Manage incoming and outgoing requests</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Request Money</Button>
      </div>

      <div className="mb-6 border-b">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Pending for You ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'received' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'sent' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Sent
          </button>
        </nav>
      </div>

      <Card>
        {activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{req.requester.name}</p>
                    <p className="text-sm text-gray-500">Requested {formatTaka(req.amount * 100)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={req.status.toLowerCase()}>{req.status}</Badge>
                    <Button variant="primary" size="sm" onClick={() => handleAction('approve', req.id)} disabled={actionLoading}>
                      Approve
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleAction('reject', req.id)} disabled={actionLoading}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No requests found</p>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {activeTab === 'sent' ? `To ${req.payer.name}` : `From ${req.requester.name}`}
                    </p>
                    <p className="text-sm text-gray-500">{formatTaka(req.amount * 100)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={req.status.toLowerCase()}>{req.status}</Badge>
                    {req.status === 'PENDING' && activeTab === 'sent' && (
                      <Button variant="danger" size="sm" onClick={() => handleAction('cancel', req.id)} disabled={actionLoading}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Card>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Request Money">
        <form onSubmit={handleCreateRequest}>
          <div className="mb-4">
            <label className="label">From User</label>
            <UserSearch onSelect={setCreateRecipient} excludeId={user.id} />
            {createRecipient && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium">{createRecipient.name}</p>
                <p className="text-sm text-gray-500">{createRecipient.email}</p>
              </div>
            )}
          </div>
          <Input label="Amount (BDT)" type="number" value={createAmount} onChange={(e) => setCreateAmount(e.target.value)} min="1" required disabled={!createRecipient} />
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={!createRecipient || !createAmount || actionLoading}>
              {actionLoading ? 'Creating...' : 'Request Money'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}