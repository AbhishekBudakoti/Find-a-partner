import { useEffect, useState } from "react";
import apiClient from "../api/client";

/**
 * Lists the users the current user has blocked, with an Unblock action.
 * Unblocking doesn't restore the old partnership — they'd need a new request.
 */
const BlockedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    // Ignore a response that lands after unmount.
    let ignore = false;

    apiClient
      .get("/blocks")
      .then(({ data }) => {
        if (!ignore) setUsers(data.data?.users || []);
      })
      .catch((err) => {
        if (!ignore) setErrorMsg(err.response?.data?.message || "Failed to load blocked users");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const unblock = async (userId) => {
    setBusyId(userId);
    setErrorMsg("");
    try {
      await apiClient.delete(`/blocks/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to unblock");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="max-w-[560px] mx-auto mb-8 p-6 bg-white rounded-xl border border-slate-200">
      <h2 className="text-base font-semibold text-slate-900 m-0">Blocked users</h2>
      <p className="text-xs text-slate-500 mt-1 mb-3">
        Blocked people can't find, request or message you. Unblocking won't restore an old partnership.
      </p>

      {errorMsg && <p className="text-sm text-red-600 mb-2">{errorMsg}</p>}

      {loading ? (
        <p className="text-sm text-slate-400 m-0">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-400 m-0">You haven't blocked anyone.</p>
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-slate-100">
          {users.map((u) => (
            <li key={u._id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{u.name || u.email}</div>
                <div className="text-xs text-slate-500">
                  Blocked {new Date(u.blockedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                type="button"
                disabled={busyId === u._id}
                onClick={() => unblock(u._id)}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                {busyId === u._id ? "Unblocking..." : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default BlockedUsers;
