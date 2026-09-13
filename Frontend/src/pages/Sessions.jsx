import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import UserActionsMenu from "../components/UserActionsMenu";

// Mirrors SESSION_STATUSES in Backend/models/session.model.js.
const STATUS_STYLE = {
  requested: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  upcoming: "bg-indigo-100 text-indigo-800",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

const inputClass =
  "px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";

const formatWhen = (iso) =>
  new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * `datetime-local` yields a naive local string ("2026-09-12T16:00") which the
 * backend would read as UTC. Convert through Date so the instant the user
 * picked is the instant the server stores.
 */
const toISO = (localValue) => (localValue ? new Date(localValue).toISOString() : "");

/** Lower bound for the picker, in the format `datetime-local` expects. */
const nowForInput = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const emptyForm = {
  match: "",
  activity: "",
  scheduledAt: "",
  durationMinutes: 60,
  locationName: "",
};

const SessionCard = ({ session, currentUserId, busy, onAction, onBlocked }) => {
  const partner = (session.participants || []).find(
    (p) => (p._id || p).toString() !== currentUserId
  );
  const partnerId = (partner?._id || partner)?.toString();
  const isProposer =
    (session.proposedBy?._id || session.proposedBy)?.toString() === currentUserId;

  // Accept/reject are the recipient's call only — the backend rejects a
  // proposer accepting their own session, so don't offer the button.
  const canRespond = session.status === "requested" && !isProposer;
  const canCancel = !["completed", "cancelled"].includes(session.status);
  // `completed` is reachable only from `active` (see ALLOWED_TRANSITIONS).
  const canComplete = session.status === "active";

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">
              {session.activity?.name || "Activity"} with{" "}
              {partner?.name || partner?.email || "partner"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                STATUS_STYLE[session.status] || "bg-slate-200 text-slate-700"
              }`}
            >
              {session.status}
            </span>
          </div>

          <div className="text-xs text-slate-600 mt-1">
            {formatWhen(session.scheduledAt)} · {session.durationMinutes} min
            {session.location?.name ? ` · ${session.location.name}` : ""}
          </div>

          <div className="text-[11px] text-slate-400 mt-0.5">
            {isProposer ? "You proposed this" : "Proposed to you"}
          </div>

          {session.status === "cancelled" && session.cancelReason && (
            <div className="text-xs text-red-600 mt-1">
              {session.cancelReason}
              {session.cancelledBy?.name ? ` — ${session.cancelledBy.name}` : ""}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0 items-center">
          {canRespond && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction(session._id, "accept")}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction(session._id, "reject")}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                Reject
              </button>
            </>
          )}

          {canComplete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(session._id, "complete")}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              Mark done
            </button>
          )}

          {canCancel && !canRespond && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(session._id, "cancel")}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          )}

          {/* Passing the session lets the report reference it (enables "no-show"). */}
          <UserActionsMenu
            userId={partnerId}
            userName={partner?.name}
            sessionId={session._id}
            onBlocked={onBlocked}
          />
        </div>
      </div>
    </div>
  );
};

const Sessions = () => {
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const currentUserId = (user?._id || "").toString();

  const [matches, setMatches] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/sessions");
      setSessions(data.data?.sessions || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Partner picker: POST /sessions needs a match id, which only
  // /matches/mine exposes (/matches is the ranked candidate search).
  const loadMatches = useCallback(() => {
    apiClient
      .get("/matches/mine")
      .then(({ data }) => setMatches(data.data?.matches || []))
      .catch(() => {});
  }, []);

  // Blocking ends the match and cancels open sessions, so refresh both lists.
  const handleBlocked = () => {
    load();
    loadMatches();
  };

  useEffect(() => {
    load();
    loadMatches();

    apiClient
      .get("/activities")
      .then(({ data }) => setActivities(data.data?.activities || []))
      .catch(() => {});
  }, [load, loadMatches]);

  // Depend on the ids as a stable string, not the `sessions` array: every
  // reload produces a new array identity, which would otherwise make the
  // effect below leave and rejoin every room on each refresh.
  const sessionIdKey = useMemo(
    () => sessions.map((s) => s._id).sort().join(","),
    [sessions]
  );

  // Join each session's room so lifecycle transitions and reminders arrive
  // live. The backend refuses rooms the user isn't a participant of.
  useEffect(() => {
    if (!socket || !sessionIdKey) return;

    const ids = sessionIdKey.split(",");
    ids.forEach((sessionId) => socket.emit("session:join", { sessionId }));

    const onUpdated = ({ sessionId, status }) => {
      setSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, status } : s))
      );
    };
    const onReminder = ({ message }) => setOkMsg(message);

    socket.on("session:updated", onUpdated);
    socket.on("session:reminder", onReminder);

    return () => {
      socket.off("session:updated", onUpdated);
      socket.off("session:reminder", onReminder);
      ids.forEach((sessionId) => socket.emit("session:leave", { sessionId }));
    };
  }, [socket, sessionIdKey]);

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const propose = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setOkMsg("");
    setSubmitting(true);

    try {
      await apiClient.post("/sessions", {
        match: form.match,
        activity: form.activity,
        scheduledAt: toISO(form.scheduledAt),
        durationMinutes: Number(form.durationMinutes),
        location: form.locationName ? { name: form.locationName } : undefined,
      });
      setForm(emptyForm);
      setOkMsg("Session proposed.");
      await load();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to propose session");
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (id, action) => {
    setErrorMsg("");
    setOkMsg("");
    setBusyId(id);
    try {
      await apiClient.patch(`/sessions/${id}/${action}`);
      await load();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Failed to ${action} session`);
    } finally {
      setBusyId(null);
    }
  };

  // Split rather than re-fetching with ?upcoming=true, so one load drives
  // both lists and a socket status change re-groups without a round trip.
  const { upcoming, past } = useMemo(() => {
    const isDone = (s) => ["completed", "cancelled"].includes(s.status);
    return {
      upcoming: sessions
        .filter((s) => !isDone(s))
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
      past: sessions
        .filter(isDone)
        .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)),
    };
  }, [sessions]);

  return (
    <div className="max-w-3xl mx-auto px-4 my-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Sessions</h1>
      <p className="text-sm text-slate-600 mb-5">
        Schedule real meetups with partners you've matched with.
      </p>

      {matches.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 text-sm text-slate-600 mb-6">
          You don't have any partners yet. Accept a request on the{" "}
          <span className="font-semibold text-slate-900">Requests</span> page
          first — sessions are scheduled with an existing partner.
        </div>
      ) : (
        <form
          onSubmit={propose}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-6 flex flex-wrap gap-2 items-end"
        >
          <select
            required
            value={form.match}
            onChange={(e) => setField("match", e.target.value)}
            className={inputClass}
          >
            <option value="">Choose partner</option>
            {matches.map((m) => (
              <option key={m._id} value={m._id}>
                {m.partner?.name || m.partner?.email || "Partner"}
              </option>
            ))}
          </select>

          <select
            required
            value={form.activity}
            onChange={(e) => setField("activity", e.target.value)}
            className={inputClass}
          >
            <option value="">Choose activity</option>
            {activities.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            required
            min={nowForInput()}
            value={form.scheduledAt}
            onChange={(e) => setField("scheduledAt", e.target.value)}
            className={inputClass}
          />

          <input
            type="number"
            min={15}
            step={15}
            required
            value={form.durationMinutes}
            onChange={(e) => setField("durationMinutes", e.target.value)}
            className={`${inputClass} w-24`}
            title="Duration in minutes (minimum 15)"
          />

          <input
            type="text"
            placeholder="Location (optional)"
            value={form.locationName}
            onChange={(e) => setField("locationName", e.target.value)}
            className={`${inputClass} flex-1 min-w-40`}
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Proposing..." : "Propose"}
          </button>
        </form>
      )}

      {errorMsg && <p className="text-sm text-red-600 mb-3">{errorMsg}</p>}
      {okMsg && <p className="text-sm text-emerald-700 mb-3">{okMsg}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading sessions...</p>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-slate-700 mt-6 mb-2">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing scheduled.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcoming.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  currentUserId={currentUserId}
                  busy={busyId === session._id}
                  onAction={act}
                  onBlocked={handleBlocked}
                />
              ))}
            </div>
          )}

          <h2 className="text-sm font-semibold text-slate-700 mt-7 mb-2">
            Past
          </h2>
          {past.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing here yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {past.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  currentUserId={currentUserId}
                  busy={busyId === session._id}
                  onAction={act}
                  onBlocked={handleBlocked}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Sessions;
