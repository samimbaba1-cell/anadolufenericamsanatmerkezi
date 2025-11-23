"use client";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (_) {
          localStorage.removeItem("user");
        }
      }
      apiFetch("/api/users/profile", { token: storedToken })
        .then((res) => {
          setUser(res.user);
          localStorage.setItem("user", JSON.stringify(res.user));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiFetch("/api/users/login", { method: "POST", body: { email, password } });
    setToken(res.token);
    setUser(res.user);
    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
    return res.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await apiFetch("/api/users/register", { method: "POST", body: payload });
    setToken(res.token);
    setUser(res.user);
    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
    }
    return res.user;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    const res = await apiFetch("/api/users/profile", { token });
    setUser(res.user);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(res.user));
    }
    return res.user;
  }, [token]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, []);

  const value = useMemo(() => ({ token, user, loading, login, register, logout, refreshUser }), [token, user, loading, login, register, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
