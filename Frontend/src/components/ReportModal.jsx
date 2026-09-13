import { useState } from "react";
import apiClient from "../api/client";
import Modal from "./Modal";

// Mirrors REPORT_REASONS in Backend/models/report.model.js.
const REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam or scam" },
  { value: "fake_profile", label: "Fake profile" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "unsafe_behaviour", label: "Unsafe behaviour" },
  { value: "no_show", label: "Didn't show up to our session", needsSession: true },
  { value: "other", label: "Something else" },
];

const MAX_DETAILS = 1000;

/**
 * Report dialog. Mount it only while open so every report starts blank.
 * `onClose(result)` receives `{ blocked: true }` when the user also blocked,
 * so the parent can remove the person from view after the thank-you screen.
 */
const ReportModal = ({ userId, userName, sessionId, onClose }) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  const reasons = REASONS.filter((r) => !r.needsSession || sessionId);
  const name = userName || "this user";

  const handleClose = () => onClose(result);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const { data } = await apiClient.post("/reports", {
        reportedUser: userId,
        reason,
        details: details.trim(),
        ...(sessionId && { session: sessionId }),
        alsoBlock,
      });
      setResult({ blocked: Boolean(data.data?.blocked) });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Couldn't send the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Modal title="Report sent" onClose={handleClose}>
        <p className="text-sm text-slate-600 m-0">
          Thanks for letting us know. Our team will review your report. {name} won't be told who reported them.
          {result.blocked && ` You've also blocked ${name}.`}
        </p>
        <div className="flex justify-end mt-5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Report ${name}`} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs font-medium text-slate-600">
          What happened?
          <select
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="">Choose a reason</option>
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-slate-600">
          Details <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={MAX_DETAILS}
            rows={4}
            placeholder="Anything that helps our team understand what happened"
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <span className="block text-right text-[11px] text-slate-400 tabular-nums">
            {details.length}/{MAX_DETAILS}
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={alsoBlock}
            onChange={(e) => setAlsoBlock(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Also block {name}
            <span className="block text-xs text-slate-500">
              You'll stop seeing each other and your partnership will end.
            </span>
          </span>
        </label>

        {errorMsg && (
          <p role="alert" className="text-sm text-red-600 m-0">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !reason}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? "Sending..." : "Send report"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportModal;
