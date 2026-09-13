import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Minimal accessible dialog. Rendered into document.body via a portal so it
 * isn't clipped or offset by the card/menu it was opened from.
 * Closes on Escape and on a click on the backdrop.
 */
const Modal = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5"
      >
        <h2 id="modal-title" className="text-base font-semibold text-slate-900 m-0 mb-3">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
