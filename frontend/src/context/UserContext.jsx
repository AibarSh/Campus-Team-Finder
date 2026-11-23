import { createContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = () =>
    authApi
      .getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
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