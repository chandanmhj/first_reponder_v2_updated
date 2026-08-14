import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth as authApi, getStoredUser, storeSession, clearSession, setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [sessionExpired, setSessionExpired] = useState(false);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  const signup = useCallback(async (username, password) => {
    const data = await authApi.signup(username, password);
    storeSession(data.access_token, data.user_id, data.username);
    setUser({ userId: data.user_id, username: data.username });
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    storeSession(data.access_token, data.user_id, data.username);
    setUser({ userId: data.user_id, username: data.username });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const acknowledgeSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <AuthContext.Provider
      value={{ user, ready, signup, login, logout, sessionExpired, acknowledgeSessionExpired }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
