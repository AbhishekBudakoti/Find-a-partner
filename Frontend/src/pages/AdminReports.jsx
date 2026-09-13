import { useEffect, useState } from "react";
import apiClient from "../api/client";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "actioned", label: "Actioned" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

// Mirrors REPORT_REASONS in Backend/models/report.model.js.
const REASON_LABEL = {
  harassment: "Harassment",
  spam: "Spam",
  fake_profile: "Fake profile",
  no_show: "No-show",
  inappropriate: "Inappropriate",
  unsafe_behaviour: "Unsafe behaviour",
  other: "Other",
};

const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-800",
  actioned: "bg-red-100 text-red-800",
  dismissed: "bg-slate-200 text-slate-700",
};

const ACTION_LABEL = { none: "No action", warned: "Warned", suspended: "Suspended" };

const formatDate = (iso) =>
  new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isCurrentlySuspended = (user) =>
  user?.isSuspended && (!user.suspendedUntil || new Date(user.suspendedUntil) > new Date());

const Badge = ({ className, children }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>{children}</span>
);

const ReportCard = ({ report, busy, onResolve }) => {
  const [note, setNote] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");

  const target = report.reportedUser;
  const isPending = report.status === "pending";
  const targetIsAdmin = target?.role === "admin";

  const resolve = (action) => {
    const days = suspendDays.trim();
    if (action === "suspend" && !days && !window.confirm(`Permanently suspend ${target?.name || "this user"}?`)) {
      return;
    }

    onResolve(report._id, {
      action,
      adminNote: note,
      ...(action === "suspend" && days && { suspendDays: Number(days) }),
    });
  };

  return (
    <article className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-rose-50 text-rose-700">{REASON_LABEL[report.reason] || report.reason}</Badge>
        <Badge className={STATUS_STYLE[report.status]}>{report.status}</Badge>
        <span className="text-xs text-slate-400 ml-auto">{formatDate(report.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reported user</div>
          <div className="text-sm font-semibold text-slate-900">{target?.name || "Deleted user"}</div>
          <div className="text-xs text-slate-500 break-all">{target?.email}</div>
          {target && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge className={report.reportedUserReportCount > 1 ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}>
                {report.reportedUserReportCount} report{report.reportedUserReportCount === 1 ? "" : "s"} total
              </Badge>
              {target.warningsCount > 0 && (
                <Badge className="bg-amber-100 text-amber-800">
                  {target.warningsCount} warning{target.warningsCount === 1 ? "" : "s"}
                </Badge>
              )}
              {isCurrentlySuspended(target) && (
                <Badge className="bg-red-600 text-white">
                  {target.suspendedUntil
                    ? `Suspended until ${new Date(target.suspendedUntil).toLocaleDateString()}`
                    : "Permanently suspended"}
                </Badge>
              )}
              {targetIsAdmin && <Badge className="bg-indigo-100 text-indigo-800">Admin</Badge>}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reported by</div>
          <div className="text-sm font-semibold text-slate-900">{report.reporter?.name || "Deleted user"}</div>
          <div className="text-xs text-slate-500 break-all">{report.reporter?.email}</div>
        </div>
      </div>

      <p className={`text-sm mt-3 mb-0 whitespace-pre-wrap ${report.details ? "text-slate-700" : "text-slate-400 italic"}`}>
        {report.details || "No details provided."}
      </p>

      {report.session && (
        <div className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2">
          Session: {report.session.activity?.name || "Activity"} · {formatDate(report.session.scheduledAt)} ·{" "}
          {report.session.status}
        </div>
      )}

      {isPending ? (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Internal note (optional)"
            aria-label="Internal admin note"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => resolve("dismiss")}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              disabled={busy || targetIsAdmin || !target}
              onClick={() => resolve("warn")}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-300 rounded-lg hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              Warn
            </button>
            <div className="flex items-center gap-1.5 ml-auto">
              <label className="text-xs text-slate-500" htmlFor={`days-${report._id}`}>
                Days
              </label>
              <input
                id={`days-${report._id}`}
                type="number"
                min={1}
                max={365}
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value)}
                placeholder="∞"
                title="Leave blank for a permanent suspension"
                className="w-16 px-2 py-1.5 text-xs rounded-lg border border-slate-300"
              />
              <button
                type="button"
                disabled={busy || targetIsAdmin || !target}
                onClick={() => resolve("suspend")}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold">{ACTION_LABEL[report.action] || report.action}</span>
          {report.reviewedBy && ` by ${report.reviewedBy.name}`}
          {report.reviewedAt && ` · ${formatDate(report.reviewedAt)}`}
          {report.adminNote && <div className="mt-1 text-slate-500">Note: {report.adminNote}</div>}
        </div>
      )}
    </article>
  );
};

const AdminReports = () => {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [suspendedUsers, setSuspendedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  // Bumped after an admin action so both lists re-fetch.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Ignore responses from a tab/page the admin has already moved away from.
    let ignore = false;

    apiClient
      .get("/admin/reports", { params: { status, page } })
      .then(({ data }) => {
        if (ignore) return;
        setReports(data.data?.reports || []);
        setCounts(data.data?.counts || {});
        setPagination(data.data?.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((err) => {
        if (!ignore) setErrorMsg(err.response?.data?.message || "Failed to load reports");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [status, page, reloadKey]);

  useEffect(() => {
    let ignore = false;

    apiClient
      .get("/admin/users/suspended")
      .then(({ data }) => {
        if (!ignore) setSuspendedUsers(data.data?.users || []);
      })
      .catch(() => {
        // Non-fatal — the report queue still works without this list.
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const changeTab = (key) => {
    if (key === status) return;
    setLoading(true);
    setStatus(key);
    setPage(1);
  };

  const resolveReport = async (id, body) => {
    setBusyId(id);
    setErrorMsg("");
    setOkMsg("");
    try {
      await apiClient.patch(`/admin/reports/${id}`, body);
      const outcome = { dismiss: "dismissed", warn: "user warned", suspend: "user suspended" }[body.action];
      setOkMsg(`Report resolved — ${outcome}.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to resolve report");
    } finally {
      setBusyId(null);
    }
  };

  const unsuspend = async (userId) => {
    setBusyId(userId);
    setErrorMsg("");
    setOkMsg("");
    try {
      await apiClient.patch(`/admin/users/${userId}/unsuspend`);
      setOkMsg("Suspension lifted.");
      setReloadKey((key) => key + 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to lift suspension");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 my-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Moderation</h1>
      <p className="text-sm text-slate-600 mb-5">Review user reports and manage suspensions.</p>

      <div role="tablist" className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={status === tab.key}
            onClick={() => changeTab(tab.key)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg cursor-pointer ${
              status === tab.key ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-slate-400 tabular-nums">{counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {errorMsg && <p role="alert" className="text-sm text-red-600 mb-3">{errorMsg}</p>}
      {okMsg && <p className="text-sm text-emerald-700 mb-3">{okMsg}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading reports...</p>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-sm text-slate-500 text-center">
          {status === "pending" ? "No reports waiting for review." : "No reports here."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <ReportCard
              key={report._id}
              report={report}
              busy={busyId === report._id}
              onResolve={resolveReport}
            />
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-slate-500 tabular-nums">
            Page {pagination.page} of {pagination.pages}
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

      <h2 className="text-sm font-semibold text-slate-700 mt-8 mb-2">Suspended users</h2>
      {suspendedUsers.length === 0 ? (
        <p className="text-sm text-slate-400">No one is suspended.</p>
      ) : (
        <ul className="list-none m-0 p-0 bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100">
          {suspendedUsers.map((u) => (
            <li key={u._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                <div className="text-xs text-slate-500">
                  {u.email} · {u.suspendedUntil ? `until ${new Date(u.suspendedUntil).toLocaleDateString()}` : "permanent"}
                  {u.suspensionReason && ` · ${REASON_LABEL[u.suspensionReason] || u.suspensionReason}`}
                </div>
              </div>
              <button
                type="button"
                disabled={busyId === u._id}
                onClick={() => unsuspend(u._id)}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Lift suspension
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminReports;
