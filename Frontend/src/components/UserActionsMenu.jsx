import { useEffect, useRef, useState } from "react";
import apiClient from "../api/client";
import Modal from "./Modal";
import ReportModal from "./ReportModal";

/**
 * "⋯" menu with Report and Block for another user.
 *
 * @param {string} userId - The other user
 * @param {string} [userName]
 * @param {string} [sessionId] - When set, reports can reference that session (enables "no-show")
 * @param {(userId: string) => void} [onBlocked] - Called after a block (directly or via "also block")
 */
const UserActionsMenu = ({ userId, userName, sessionId, onBlocked }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const menuRef = useRef(null);

  const name = userName || "this user";

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (!userId) return null;

  const openReport = () => {
    setMenuOpen(false);
    setReportOpen(true);
  };

  const openBlockConfirm = () => {
    setMenuOpen(false);
    setErrorMsg("");
    setConfirmOpen(true);
  };

  const handleBlock = async () => {
    setBlocking(true);
    setErrorMsg("");
    try {
      await apiClient.post(`/blocks/${userId}`);
      setConfirmOpen(false);
      onBlocked?.(userId);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Couldn't block this user. Please try again.");
    } finally {
      setBlocking(false);
    }
  };

  const handleReportClose = (result) => {
    setReportOpen(false);
    if (result?.blocked) onBlocked?.(userId);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        aria-label={`More actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
      >
        ⋯
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-20 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openReport}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Report
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={openBlockConfirm}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            Block
          </button>
        </div>
      )}

      {confirmOpen && (
        <Modal title={`Block ${name}?`} onClose={() => !blocking && setConfirmOpen(false)}>
          <ul className="text-sm text-slate-600 m-0 pl-5 space-y-1 list-disc">
            <li>You won't see each other in Discover</li>
            <li>Your partnership ends and neither of you can send messages</li>
            <li>Pending requests and upcoming sessions are cancelled</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3 mb-0">
            {name} won't be notified. You can unblock them later from your profile.
          </p>

          {errorMsg && (
            <p role="alert" className="text-sm text-red-600 mt-3 mb-0">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              disabled={blocking}
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={blocking}
              onClick={handleBlock}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              {blocking ? "Blocking..." : "Block"}
            </button>
          </div>
        </Modal>
      )}

      {reportOpen && (
        <ReportModal
          userId={userId}
          userName={userName}
          sessionId={sessionId}
          onClose={handleReportClose}
        />
      )}
    </div>
  );
};

export default UserActionsMenu;
