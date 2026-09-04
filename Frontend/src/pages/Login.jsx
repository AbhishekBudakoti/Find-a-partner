import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const inputStyle = {
  padding: "10px 12px",
  fontSize: "14px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
};

const Login = () => {
  const { user, refresh } = useAuth();
  const { connectSocket } = useSocket() || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in — nothing to do here.
  if (user) {
    const redirectTo = location.state?.from?.pathname || "/discover";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      await apiClient.post("/auth/login", { email, password });
      await refresh();
      if (connectSocket) connectSocket();
      navigate(location.state?.from?.pathname || "/discover", { replace: true });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "360px", margin: "60px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "20px", color: "#0f172a" }}>Log in</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {errorMsg && <span style={{ fontSize: "13px", color: "#dc2626" }}>{errorMsg}</span>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "10px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "#2563eb",
            border: "none",
            borderRadius: "6px",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p style={{ marginTop: "16px", fontSize: "13px", color: "#64748b" }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
};

export default Login;
