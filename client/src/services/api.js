const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

// Helper to get auth header
const getAuthHeaders = (headers = {}) => {
  const token = localStorage.getItem('kgp_token');
  return {
    ...headers,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Helper for multipart/form-data
const getFormDataHeaders = (headers = {}) => {
  const token = localStorage.getItem('kgp_token');
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // ─── Auth ──────────────────────────────────────────────
  loginWithGoogle: async (idToken, whatsappNumber = null, accessToken = null) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, whatsappNumber, accessToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  loginWithMock: async (name, email, whatsappNumber) => {
    const res = await fetch(`${API_URL}/api/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, whatsappNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  updateWhatsApp: async (userId, whatsappNumber) => {
    const res = await fetch(`${API_URL}/api/auth/me/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ whatsappNumber }),
    });
    if (!res.ok) throw new Error('Failed to update WhatsApp number');
    return res.json();
  },

  // ─── Items ─────────────────────────────────────────────
  getItems: async (type = 'ALL', category = null) => {
    const params = new URLSearchParams();
    if (type !== 'ALL') params.set('type', type);
    if (category) params.set('category', category);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_URL}/api/items${query}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
  },

  getItem: async (id) => {
    const res = await fetch(`${API_URL}/api/items/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch item');
    return res.json();
  },

  getItemMatches: async (itemId) => {
    const res = await fetch(`${API_URL}/api/items/${itemId}/matches`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  },

  createItem: async (itemData) => {
    const isFormData = itemData instanceof FormData;
    const res = await fetch(`${API_URL}/api/items`, {
      method: 'POST',
      headers: isFormData ? getFormDataHeaders() : getAuthHeaders(),
      body: isFormData ? itemData : JSON.stringify(itemData),
    });
    if (!res.ok) throw new Error('Failed to create item');
    return res.json();
  },

  purgeImages: async (itemId) => {
    const res = await fetch(`${API_URL}/api/items/${itemId}/purge-images`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to purge images');
    return res.json();
  },

  resolveItem: async (itemId) => {
    const res = await fetch(`${API_URL}/api/items/${itemId}/resolve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to resolve item');
    return res.json();
  },

  deleteItem: async (itemId) => {
    const res = await fetch(`${API_URL}/api/items/${itemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete item');
    return res.json();
  },

  // ─── Claims ────────────────────────────────────────────
  submitClaim: async (itemId, identifyingInfo) => {
    const res = await fetch(`${API_URL}/api/claims`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ itemId, identifyingInfo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit claim');
    return data;
  },

  getReceivedClaims: async () => {
    const res = await fetch(`${API_URL}/api/claims/received`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch received claims');
    return res.json();
  },

  getSentClaims: async () => {
    const res = await fetch(`${API_URL}/api/claims/sent`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch sent claims');
    return res.json();
  },

  acceptClaim: async (claimId) => {
    const res = await fetch(`${API_URL}/api/claims/${claimId}/accept`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to accept claim');
    return res.json();
  },

  rejectClaim: async (claimId, responseNote = '') => {
    const res = await fetch(`${API_URL}/api/claims/${claimId}/reject`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ responseNote }),
    });
    if (!res.ok) throw new Error('Failed to reject claim');
    return res.json();
  },

  requestMoreInfo: async (claimId, responseNote) => {
    const res = await fetch(`${API_URL}/api/claims/${claimId}/more-info`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ responseNote }),
    });
    if (!res.ok) throw new Error('Failed to request more info');
    return res.json();
  },

  // ─── Reports ───────────────────────────────────────────
  reportContent: async (targetType, targetId, reason, details = '') => {
    const res = await fetch(`${API_URL}/api/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetType, targetId, reason, details }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit report');
    return data;
  },

  // ─── Notifications ─────────────────────────────────────
  getNotifications: async () => {
    const res = await fetch(`${API_URL}/api/notifications`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  getUnreadCount: async () => {
    const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch unread count');
    return res.json();
  },

  markNotificationRead: async (notifId) => {
    const res = await fetch(`${API_URL}/api/notifications/${notifId}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to update notification');
    return res.json();
  },

  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark all as read');
    return res.json();
  },

  // ─── Admin ─────────────────────────────────────────────
  adminFetch: async (path, options = {}) => {
    const res = await fetch(`${API_URL}/api/admin${path}`, {
      cache: 'no-store',
      ...options,
      headers: getAuthHeaders(options.headers || {}),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Admin request failed');
    }
    return res.json();
  },
};
