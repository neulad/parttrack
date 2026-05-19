const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  getStations: () => request('/stations'),
  createStation: (data) => request('/stations', { method: 'POST', body: data }),
  deleteStation: (id) => request(`/stations/${id}`, { method: 'DELETE' }),

  getParts: (station_id) =>
    request(`/parts${station_id ? `?station_id=${station_id}` : ''}`),
  createPart: (data) => request('/parts', { method: 'POST', body: data }),
  updateQuantity: (id, quantity, note) =>
    request(`/parts/${id}/quantity`, { method: 'PATCH', body: { quantity, note } }),
  deletePart: (id) => request(`/parts/${id}`, { method: 'DELETE' }),

  getAuditLog: (limit = 50, offset = 0) =>
    request(`/admin/audit-log?limit=${limit}&offset=${offset}`),
  getUsers: () => request('/admin/users'),
  createUser: (data) => request('/admin/users', { method: 'POST', body: data }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  checkStock: () => request('/admin/check-stock', { method: 'POST' }),
};
