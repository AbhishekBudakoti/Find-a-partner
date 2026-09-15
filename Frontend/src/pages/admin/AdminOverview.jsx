import { useEffect, useState } from "react";
import apiClient from "../../api/client";

// Mirrors SESSION_STATUSES in Backend/models/session.model.js.
const SESSION_STATUS_ORDER = ["requested", "accepted", "upcoming", "active", "completed", "cancelled"];

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let ignore = false;

    apiClient
      .get("/admin/stats")
      .then(({ data }) => {
        if (!ignore) setStats(data.data);
      })
      .catch((err) => {
        if (!ignore) setErrorMsg(err.response?.data?.message || "Failed to load stats");
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (errorMsg) return <p role="alert" className="text-sm text-red-600">{errorMsg}</p>;
  if (!stats) return <p className="text-sm text-slate-500">Loading stats...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Users" value={stats.users.total} sub={`+${stats.users.newLast7Days} last 7 days`} />
        <StatCard label="Suspended" value={stats.users.suspended} sub={`${stats.users.admins} admin${stats.users.admins === 1 ? "" : "s"}`} />
        <StatCard label="Active matches" value={stats.matches.active} sub={`${stats.matches.total} total`} />
        <StatCard label="Pending reports" value={stats.reports.pending} sub={`${stats.reports.last7Days} filed last 7 days`} />
        <StatCard label="Profiles" value={stats.profiles.total} />
        <StatCard label="Activities" value={stats.activities.active} sub={`${stats.activities.total} total`} />
        <StatCard label="Sessions" value={stats.sessions.total} />
        <StatCard
          label="Avg. rating"
          value={stats.reviews.total ? stats.reviews.averageRating.toFixed(1) : "—"}
          sub={`${stats.reviews.total} review${stats.reviews.total === 1 ? "" : "s"}`}
        />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-700 m-0 mb-3">Sessions by status</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {SESSION_STATUS_ORDER.map((status) => (
            <div key={status} className="text-center">
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {stats.sessions.byStatus[status] ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 capitalize">{status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
