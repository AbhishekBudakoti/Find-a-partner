import { BrowserRouter } from "react-router-dom";
import NotificationPanel from "./components/NotificationPanel";
import NotificationTest from "./components/NotificationTest";
import { useSocket } from "./context/SocketContext";

function App() {
  const { connected } = useSocket() || {};

  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
        {/* Header / Navbar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>
              Find a Partner
            </h1>
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
            <NotificationPanel />
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ maxWidth: "900px", margin: "24px auto", padding: "0 16px" }}>
          <NotificationTest />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
