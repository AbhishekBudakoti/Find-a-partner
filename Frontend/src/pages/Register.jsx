import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const inputStyle = {
  padding: "10px 12px",
  fontSize: "14px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
};

const Register = () => {
  const { user, refresh } = useAuth();
  const { connectSocket } = useSocket() || {};
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/discover" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      await apiClient.post("/auth/register", { name, email, password });
      // Registration doesn't set the auth cookie — log the new user straight in.
      await apiClient.post("/auth/login", { email, password });
      await refresh();
      if (connectSocket) connectSocket();
      navigate("/profile", { replace: true });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "360px", margin: "60px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "20px", color: "#0f172a" }}>Create an account</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />
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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
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
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p style={{ marginTop: "16px", fontSize: "13px", color: "#64748b" }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
};

export default Register;
