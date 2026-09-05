import { NavLink, Outlet } from "react-router-dom";
import AuthBar from "../components/AuthBar";
import NotificationPanel from "../components/NotificationPanel";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-slate-900"
  }`;

const Layout = () => {
  const { user } = useAuth();
  const { connected } = useSocket() || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-xs flex-wrap gap-3">
        <div className="flex items-center gap-5">
          <h1 className="m-0 text-xl font-bold text-slate-900">Find a Partner</h1>

          {user && (
            <nav className="flex gap-4">
              <NavLink to="/discover" className={navLinkClass}>
                Discover
              </NavLink>
              <NavLink to="/requests" className={navLinkClass}>
                Requests
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
            </nav>
          )}

          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              connected ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
            }`}
          >
            {connected ? "Socket Connected" : "Disconnected"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <AuthBar />
          {user && <NotificationPanel />}
        </div>
      </header>

      <main className="pb-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
