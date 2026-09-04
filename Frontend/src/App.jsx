import { useState } from "react";
import { BrowserRouter } from "react-router-dom";

import NotificationPanel from "./components/NotificationPanel";
import NotificationTest from "./components/NotificationTest";
import ChatWindow from "./components/ChatWindow";
import AuthBar from "./components/AuthBar";

import { useSocket } from "./context/SocketContext";

function App() {
  const { connected } = useSocket() || {};
  const [authVersion, setAuthVersion] = useState(0);

  // Replace this with User B's actual MongoDB ID
  const testUserId = "6a88351b966c82d47426e15d";

  const handleAuthChange = () => {
    setAuthVersion((prev) => prev + 1);
  };

  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
        }}
      >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "20px",
                color: "#0f172a",
              }}
            >
              Find a Partner
            </h1>

            <span
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: connected
                  ? "#dcfce7"
                  : "#fee2e2",
                color: connected
                  ? "#166534"
                  : "#991b1b",
                fontWeight: "500",
              }}
            >
              {connected
                ? "Socket Connected"
                : "Disconnected"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <AuthBar onAuthChange={handleAuthChange} />
            <NotificationPanel />
          </div>
        </header>

        {/* Main Content */}
        <main
          style={{
            maxWidth: "900px",
            margin: "24px auto",
            padding: "0 16px",
          }}
        >
          {/* Existing notification test */}
          <NotificationTest />

          {/* Temporary Chat Test */}
          <section
            style={{
              marginTop: "30px",
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#0f172a",
              }}
            >
              Chat Test
            </h2>

            <ChatWindow
              key={authVersion}
              userId={testUserId}
              userName="User B"
            />
          </section>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;