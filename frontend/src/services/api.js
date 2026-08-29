const API_BASE = '/api';

/**
 * ApiError carries the server's error code + message.
 * Server error body: { success:false, error:{ code, message, details? } }
 */
export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
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

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  // Consistent envelope: success → { success:true, data }, error → { success:false, error:{code,message} }.
  if (!response.ok || !body || body.success !== true) {
    const err = body?.error ?? {};
    throw new ApiError(
      err.message || 'Request failed',
      response.status,
      err.code || 'INTERNAL_ERROR',
      err.details,
    );
  }

  return body.data;
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
    searchUsers: (query, limit = 10) => request(`/transfers/users/search?q=${encodeURIComponent(query)}&limit=${limit}`),
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
      const qs = new URLSearchParams(params).toString();
      return request(`/transactions?${qs}`);
    },
    get: (id) => request(`/transactions/${id}`),
  },
};
