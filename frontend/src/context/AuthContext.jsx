import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, apiErrorMessage } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem("access_token", token);
    else localStorage.removeItem("access_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const register = useCallback(async ({ name, email, password }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Merges partial fields into the current user (e.g. after a profile save)
  // without requiring a full re-login. Also accepts a full replacement
  // object if the caller already has one from an API response.
  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : patch));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, loading, login, register, logout, updateUser }}
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