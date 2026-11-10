import { useEffect, useId, useRef } from "react";

// An inline "are you sure?" panel. Focus moves to Cancel when it appears;
// the caller returns focus to whatever opened it when it is cancelled.
export default function ConfirmPanel({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  error,
}) {
  const titleId = useId();
  const cancelButton = useRef(null);

  useEffect(() => {
    cancelButton.current?.focus();
  }, []);

  return (
    <section aria-labelledby={titleId} className="danger">
      <h2 id={titleId}>{title}</h2>
      {children}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="btn btn-danger" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button
        ref={cancelButton}
        className="btn btn-secondary"
        onClick={onCancel}
      >
        Cancel
      </button>
    </section>
  );
}
