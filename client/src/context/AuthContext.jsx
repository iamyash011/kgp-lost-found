import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for user in localStorage on initial load
    const storedUser = localStorage.getItem('kgp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (idToken, whatsappNumber) => {
    try {
      const { user: userData } = await api.loginWithGoogle(idToken, whatsappNumber);
      setUser(userData);
      localStorage.setItem('kgp_user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const loginMock = async (name, email, whatsappNumber) => {
    try {
      const { user: userData } = await api.loginWithMock(name, email, whatsappNumber);
      setUser(userData);
      localStorage.setItem('kgp_user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Mock Login Error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kgp_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginMock, logout, loading, setUser }}>
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
