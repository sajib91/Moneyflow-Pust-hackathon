const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const idempotencyKey = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)
    ? crypto.randomUUID()
    : undefined;

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', response.status, data);
  }

  return data;
}

export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
  },
  transfers: {
    send: (data) => request('/transfers/send', { method: 'POST', body: JSON.stringify(data) }),
    balance: () => request('/transfers/balance'),
  },
  users: {
    search: (query, limit = 10) => request(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  },
  requests: {
    create: (data) => request('/requests', { method: 'POST', body: JSON.stringify(data) }),
    list: (limit = 20, offset = 0) => request(`/requests?limit=${limit}&offset=${offset}`),
    pending: () => request('/requests/pending'),
    approve: (id) => request(`/requests/${id}/approve`, { method: 'POST' }),
    reject: (id) => request(`/requests/${id}/reject`, { method: 'POST' }),
    cancel: (id) => request(`/requests/${id}/cancel`, { method: 'POST' }),
  },
  transactions: {
    list: (params = {}) => {
      const cleaned = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
      );
      const qs = new URLSearchParams(cleaned).toString();
      return request(`/transactions?${qs}`);
    },
    get: (id) => request(`/transactions/${id}`),
  },
};

export { ApiError };