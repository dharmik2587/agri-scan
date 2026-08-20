import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import client from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("agriscan_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await client.get("/auth/me");
      setUser(data);
    } catch (e) {
      localStorage.removeItem("agriscan_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip /auth/me if returning from OAuth callback; AuthCallback will handle
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    localStorage.setItem("agriscan_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await client.post("/auth/register", { name, email, password });
    localStorage.setItem("agriscan_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const setSessionFromEmergent = async (sessionId) => {
    const { data } = await client.post("/auth/emergent-session", { session_id: sessionId });
    localStorage.setItem("agriscan_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("agriscan_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setSessionFromEmergent }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
