import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

/**
 * Displays the current login state in the navbar: a Login link when signed
 * out, or the user's name plus a Logout button when signed in. Auth state
 * itself lives in AuthContext (backed by GET /auth/me); the actual login
 * form lives on the /login page.
 */
export const AuthBar = () => {
  const { user, loading, logout } = useAuth();
  const { disconnectSocket } = useSocket() || {};

  const handleLogout = async () => {
    await logout();
    if (disconnectSocket) disconnectSocket();
  };

  if (loading) {
    return <span style={{ fontSize: "13px", color: "#64748b" }}>Checking auth status...</span>;
  }

  if (!user) {
    return (
      <Link
        to="/login"
        style={{
          padding: "6px 12px",
          fontSize: "13px",
          fontWeight: 600,
          backgroundColor: "#2563eb",
          color: "#fff",
          borderRadius: "6px",
          textDecoration: "none",
        }}
      >
        Log in
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
        👤 {user.name || user.email}
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
  );
};

export default AuthBar;
