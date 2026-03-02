import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { user, token, loading: authLoading, logout } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (authLoading) return;

      if (!user || !token) {
        setPermissions([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await client.get(`/users/${user.id}/functions`);
        const data = res.data?.data ?? res.data;
        setPermissions(Array.isArray(data) ? data : []);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // Token invalid or user not allowed to read permissions -> force re-auth
          logout();
          window.location.href = '/login';
        } else {
          console.error('Failed to load permissions:', err);
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, token, authLoading, logout]);

  const hasPermission = (functionKey) => {
    if (!functionKey) return false;
    return permissions.some(
      (p) => p && p.function_key === functionKey && p.allowed === true
    );
  };

  const value = {
    permissions,
    loading: authLoading || loading,
    error,
    hasPermission
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);

