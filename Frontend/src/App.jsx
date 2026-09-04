import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./pages/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Requests from "./pages/Requests";
import Chat from "./pages/Chat";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/chat/:userId" element={<Chat />} />
          </Route>

          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route
            path="*"
            element={
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                Page not found.
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
