import { useEffect, useState } from "react";
import apiClient from "../../api/client";

const inputClass =
  "px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40";

const isCurrentlySuspended = (user) =>
  user.isSuspended && (!user.suspendedUntil || new Date(user.suspendedUntil) > new Date());

const Badge = ({ className, children }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>{children}</span>
);

const SuspendForm = ({ userId, onSuspend, busy }) => {
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
      >
        Suspend
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 bg-red-50 border border-red-100 rounded-lg p-2 w-56">
      <input
        type="text"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        className="px-2 py-1 text-xs rounded border border-slate-300"
      />
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={365}
          placeholder="∞"
          title="Days — leave blank for permanent"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-16 px-2 py-1 text-xs rounded border border-slate-300"
        />
        <span className="text-[11px] text-slate-500">days (blank = permanent)</span>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSuspend(userId, { reason, suspendDays: days || undefined })}
          className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          {busy ? "..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2.5 py-1 text-xs font-semibold text-slate-600 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [suspended, setSuspended] = useState("all");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    // Debounce the search box so every keystroke doesn't fire a request.
    // (Loading only shows on the very first fetch — later ones just swap
    // the list in place once the response lands.)
    const timer = setTimeout(() => {
      apiClient
        .get("/admin/users", { params: { q, role: role || undefined, suspended, page } })
        .then(({ data }) => {
          if (ignore) return;
          setUsers(data.data?.users || []);
          setPagination(data.data?.pagination || { page: 1, pages: 1, total: 0 });
        })
        .catch((err) => {
          if (!ignore) setErrorMsg(err.response?.data?.message || "Failed to load users");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [q, role, suspended, page, reloadKey]);

  const runAction = async (promise, successMsg) => {
    setErrorMsg("");
    setOkMsg("");
    try {
      await promise;
      setOkMsg(successMsg);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (userId, newRole) => {
    setBusyId(userId);
    runAction(
      apiClient.patch(`/admin/users/${userId}/role`, { role: newRole }),
      `Role changed to ${newRole}.`
    );
  };

  const suspend = (userId, body) => {
    setBusyId(userId);
    runAction(apiClient.patch(`/admin/users/${userId}/suspend`, body), "User suspended.");
  };

  const unsuspend = (userId) => {
    setBusyId(userId);
    runAction(apiClient.patch(`/admin/users/${userId}/unsuspend`), "Suspension lifted.");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className={`${inputClass} flex-1 min-w-48`}
        />
        <select
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
          className={inputClass}
        >
          <option value="">Any role</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={suspended}
          onChange={(e) => {
            setPage(1);
            setSuspended(e.target.value);
          }}
          className={inputClass}
        >
          <option value="all">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
      </div>

      {errorMsg && <p role="alert" className="text-sm text-red-600 m-0">{errorMsg}</p>}
      {okMsg && <p className="text-sm text-emerald-700 m-0">{okMsg}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-400">No users match this filter.</p>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user._id} className="flex items-start justify-between gap-3 px-4 py-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                  {user.role === "admin" && <Badge className="bg-indigo-100 text-indigo-800">Admin</Badge>}
                  {isCurrentlySuspended(user) && (
                    <Badge className="bg-red-600 text-white">
                      {user.suspendedUntil ? `Until ${new Date(user.suspendedUntil).toLocaleDateString()}` : "Permanent"}
                    </Badge>
                  )}
                  {user.warningsCount > 0 && (
                    <Badge className="bg-amber-100 text-amber-800">{user.warningsCount} warning{user.warningsCount === 1 ? "" : "s"}</Badge>
                  )}
                  {user.reportsReceivedCount > 0 && (
                    <Badge className="bg-slate-100 text-slate-600">{user.reportsReceivedCount} report{user.reportsReceivedCount === 1 ? "" : "s"}</Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500 break-all">{user.email}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {user.role === "user" ? (
                  <button
                    type="button"
                    disabled={busyId === user._id}
                    onClick={() => changeRole(user._id, "admin")}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 cursor-pointer"
                  >
                    Make admin
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === user._id}
                    onClick={() => changeRole(user._id, "user")}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    Remove admin
                  </button>
                )}

                {user.role !== "admin" &&
                  (isCurrentlySuspended(user) ? (
                    <button
                      type="button"
                      disabled={busyId === user._id}
                      onClick={() => unsuspend(user._id)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Unsuspend
                    </button>
                  ) : (
                    <SuspendForm userId={user._id} onSuspend={suspend} busy={busyId === user._id} />
                  ))}
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
            Page {pagination.page} of {pagination.pages} ({pagination.total} users)
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

export default AdminUsers;
