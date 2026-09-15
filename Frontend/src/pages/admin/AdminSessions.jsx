import { useEffect, useState } from "react";
import apiClient from "../../api/client";

// Mirrors SESSION_STATUSES in Backend/models/session.model.js.
const STATUSES = ["", "requested", "accepted", "upcoming", "active", "completed", "cancelled"];

const STATUS_STYLE = {
  requested: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  upcoming: "bg-indigo-100 text-indigo-800",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

const formatWhen = (iso) =>
  new Date(iso).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

const AdminSessions = () => {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let ignore = false;

    // Loading only shows on the very first fetch; a filter/page change just
    // swaps the list in place once the response lands.
    apiClient
      .get("/admin/sessions", { params: { status: status || undefined, page } })
      .then(({ data }) => {
        if (ignore) return;
        setSessions(data.data?.sessions || []);
        setPagination(data.data?.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((err) => {
        if (!ignore) setErrorMsg(err.response?.data?.message || "Failed to load sessions");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [status, page]);

  return (
    <div className="flex flex-col gap-4">
      <select
        value={status}
        onChange={(e) => {
          setPage(1);
          setStatus(e.target.value);
        }}
        className="w-fit px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s || "Any status"}
          </option>
        ))}
      </select>

      {errorMsg && <p role="alert" className="text-sm text-red-600 m-0">{errorMsg}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-400">No sessions match this filter.</p>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100">
          {sessions.map((session) => (
            <div key={session._id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{session.activity?.name || "Activity"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[session.status] || "bg-slate-200 text-slate-700"}`}>
                    {session.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {(session.participants || []).map((p) => p.name || p.email).join(" & ")}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {formatWhen(session.scheduledAt)} · {session.durationMinutes} min
                  {session.location?.name ? ` · ${session.location.name}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-slate-500 tabular-nums">
            Page {pagination.page} of {pagination.pages} ({pagination.total} sessions)
          </span>
          <button
            type="button"
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSessions;
