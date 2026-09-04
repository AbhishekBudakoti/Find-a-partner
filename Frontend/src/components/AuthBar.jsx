import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

export const AuthBar = ({ onAuthChange }) => {
  const { connectSocket, disconnectSocket } = useSocket() || {};
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("abhishek.socket2026@gmail.com");
  const [password, setPassword] = useState("Test@12345");
  const [errorMsg, setErrorMsg] = useState("");

  const checkAuth = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/auth/me", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.data?.user) {
        setCurrentUser(data.data.user);
        setErrorMsg("");
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (loginEmail = email, loginPassword = password) => {
    setErrorMsg("");
    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.data.user);
        if (connectSocket) connectSocket();
        if (onAuthChange) onAuthChange(data.data.user);
      } else {
        setErrorMsg(data.message || "Login failed");
      }
    } catch (err) {
      setErrorMsg("Network error during login");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setCurrentUser(null);
      if (disconnectSocket) disconnectSocket();
      if (onAuthChange) onAuthChange(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return <span style={{ fontSize: "13px", color: "#64748b" }}>Checking auth status...</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      {currentUser ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
            👤 {currentUser.name || currentUser.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              backgroundColor: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "4px 8px", fontSize: "13px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "4px 8px", fontSize: "13px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button
            onClick={() => handleLogin()}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          {errorMsg && (
            <span style={{ fontSize: "12px", color: "#dc2626" }}>{errorMsg}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthBar;
