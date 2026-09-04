import { createContext, useCallback, useContext, useEffect, useState } from "react";
import apiClient from "../api/client";

/**
 * AuthContext provides the single source of truth for "who is logged in",
 * backed by GET /auth/me (the httpOnly cookie set on login is what actually
 * authenticates requests; this just tells the UI whether one is present).
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Re-checks auth status against the backend. Call after login/register/logout
   * so every consumer (Navbar, ProtectedRoute, pages) re-renders in sync.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/auth/me");
      setUser(data.data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
