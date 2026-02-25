import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('mis_token');
    const storedUser = localStorage.getItem('mis_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await client.post('/auth/login', { email, password });
    const { token: jwt, user: userInfo } = response.data.data;

    localStorage.setItem('mis_token', jwt);
    localStorage.setItem('mis_user', JSON.stringify(userInfo));

    setToken(jwt);
    setUser(userInfo);
  };

  const logout = () => {
    localStorage.removeItem('mis_token');
    localStorage.removeItem('mis_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

