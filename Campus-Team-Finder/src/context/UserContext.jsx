import { createContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

export const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await authApi.getCurrentUser();
      setUser(data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        loading,
        refreshUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}