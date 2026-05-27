const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

export const api = {
  // --- Auth ---
  loginWithGoogle: async (idToken, whatsappNumber = null, userInfo = null) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, whatsappNumber, userInfo }),
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
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    return res.json();
  },

  updateWhatsApp: async (userId, whatsappNumber) => {
    const res = await fetch(`${API_URL}/api/auth/me/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappNumber }),
    });
    if (!res.ok) throw new Error('Failed to update WhatsApp number');
    return res.json();
  },

  // --- Items ---
  getItems: async (type = 'ALL') => {
    const query = type !== 'ALL' ? `?type=${type}` : '';
    const res = await fetch(`${API_URL}/api/items${query}`);
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
  },

  createItem: async (itemData) => {
    const isFormData = itemData instanceof FormData;
    const res = await fetch(`${API_URL}/api/items`, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? itemData : JSON.stringify(itemData),
    });
    if (!res.ok) throw new Error('Failed to create item');
    return res.json();
  },

  purgeImages: async (itemId) => {
    const res = await fetch(`${API_URL}/api/items/${itemId}/purge-images`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to purge images');
    return res.json();
  },


  resolveItem: async (itemId) => {
    const res = await fetch(`${API_URL}/api/items/${itemId}/resolve`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to resolve item');
    return res.json();
  },

  deleteItem: async (itemId) => {
    const res = await fetch(`${API_URL}/api/items/${itemId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete item');
    return res.json();
  },


  // --- Notifications ---
  getNotifications: async (userId) => {
    const res = await fetch(`${API_URL}/api/notifications/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },
  
  markNotificationRead: async (matchId) => {
    const res = await fetch(`${API_URL}/api/notifications/${matchId}/read`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to update notification');
    return res.json();
  },

  // --- Admin ---
  adminFetch: async (path, options = {}) => {
    const adminEmail = 'kgp.lost.found@gmail.com';
    const res = await fetch(`${API_URL}/api/admin${path}`, {
      ...options,
      headers: {
        'x-admin-email': adminEmail,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Admin request failed');
    }
    return res.json();
  },
};
