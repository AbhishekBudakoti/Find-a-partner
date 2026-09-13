import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route guard for admin pages. Nest it inside ProtectedRoute (which handles
 * loading and logged-out users).
 *
 * This only hides the UI — the real protection is `adminOnly` on the backend.
 */
const AdminRoute = () => {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Admin access required.
      </div>
    );
  }

  return <Outlet />;
};

export default AdminRoute;
