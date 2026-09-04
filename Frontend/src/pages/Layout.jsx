import { NavLink, Outlet } from "react-router-dom";
import AuthBar from "../components/AuthBar";
import NotificationPanel from "../components/NotificationPanel";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const navLinkStyle = ({ isActive }) => ({
  fontSize: "14px",
  fontWeight: 500,
  color: isActive ? "#2563eb" : "#475569",
  textDecoration: "none",
});

const Layout = () => {
  const { user } = useAuth();
  const { connected } = useSocket() || {};

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>Find a Partner</h1>

          {user && (
            <nav style={{ display: "flex", gap: "16px" }}>
              <NavLink to="/discover" style={navLinkStyle}>
                Discover
              </NavLink>
              <NavLink to="/requests" style={navLinkStyle}>
                Requests
              </NavLink>
              <NavLink to="/profile" style={navLinkStyle}>
                Profile
              </NavLink>
            </nav>
          )}

          <span
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              borderRadius: "12px",
              backgroundColor: connected ? "#dcfce7" : "#fee2e2",
              color: connected ? "#166534" : "#991b1b",
              fontWeight: "500",
            }}
          >
            {connected ? "Socket Connected" : "Disconnected"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <AuthBar />
          {user && <NotificationPanel />}
        </div>
      </header>

      <main style={{ padding: "0 0 40px" }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
