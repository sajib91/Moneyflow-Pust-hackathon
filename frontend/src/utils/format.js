export function formatTaka(poisha) {
  const taka = poisha / 100;
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(taka);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusBadgeClass(status) {
  // Returns the badge VARIANT (Badge renders `badge badge-${variant}`).
  const variants = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    SUCCEEDED: 'succeeded',
    FAILED: 'rejected',
  };
  return variants[status] || 'default';
}