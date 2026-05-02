import { createContext, useEffect, useMemo, useState } from "react";
import { api, authApi, clearAccessToken, registerUnauthorizedHandler, setAccessToken } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthenticatedSession = (payload) => {
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    return payload.user;
  };

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
        setAuthenticatedSession(response.data);
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
        return setAuthenticatedSession(response.data);
      },
      signup: async (payload) => {
        const response = await api.post("/auth/student-signup", payload);
        return setAuthenticatedSession(response.data);
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
