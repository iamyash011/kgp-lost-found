import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { trackLogin, trackLogout } from '../utils/analytics';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const ADMIN_EMAIL = 'kgp.lost.found@gmail.com';
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    // Check for user in localStorage on initial load
    const storedUser = localStorage.getItem('kgp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (idToken, whatsappNumber, userInfo = null) => {
    try {
      const { user: userData, token } = await api.loginWithGoogle(idToken, whatsappNumber, userInfo);
      setUser(userData);
      localStorage.setItem('kgp_user', JSON.stringify(userData));
      if (token) localStorage.setItem('kgp_token', token);
      trackLogin('google', userData.email);
      return userData;
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const loginMock = async (name, email, whatsappNumber) => {
    try {
      const { user: userData, token } = await api.loginWithMock(name, email, whatsappNumber);
      setUser(userData);
      localStorage.setItem('kgp_user', JSON.stringify(userData));
      if (token) localStorage.setItem('kgp_token', token);
      trackLogin('mock', userData.email);
      return userData;
    } catch (error) {
      console.error("Mock Login Error:", error);
      throw error;
    }
  };

  const logout = () => {
    trackLogout();
    setUser(null);
    localStorage.removeItem('kgp_user');
    localStorage.removeItem('kgp_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginMock, logout, loading, setUser, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
