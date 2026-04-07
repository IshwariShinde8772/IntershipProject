import { createContext, useEffect, useMemo, useState } from "react";
import { api, authApi, clearAccessToken, registerUnauthorizedHandler, setAccessToken } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogoutState = () => {
    clearAccessToken();
    setUser(null);
  };

  useEffect(() => {
    registerUnauthorizedHandler(handleLogoutState);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await authApi.post("/auth/refresh");
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
      } catch {
        handleLogoutState();
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: async (email, password) => {
        const response = await api.post("/auth/login", { email, password });
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        return response.data.user;
      },
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          handleLogoutState();
        }
      },
      setUser
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
