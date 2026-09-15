import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/admin/overview", label: "Overview" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/activities", label: "Activities" },
  { to: "/admin/sessions", label: "Sessions" },
  { to: "/admin/reviews", label: "Reviews" },
];

const tabClass = ({ isActive }) =>
  `px-3 py-1.5 text-sm font-semibold rounded-lg cursor-pointer no-underline ${
    isActive ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
  }`;

/**
 * Shared shell for every /admin/* page: a sub-nav plus the page content.
 * AdminRoute (which checks user.role === "admin") wraps this from App.jsx.
 */
const AdminLayout = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 my-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Admin</h1>
      <p className="text-sm text-slate-600 mb-5">Platform moderation and oversight.</p>

      <nav className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={tabClass}>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
};

export default AdminLayout;
