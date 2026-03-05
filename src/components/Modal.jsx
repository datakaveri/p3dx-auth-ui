export default function Modal({ open, title, description, confirmText = "Confirm", cancelText = "Cancel", confirmVariant = "primary", onConfirm, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
        </div>
        {description ? <div className="modal-body">{description}</div> : null}
        <div className="modal-actions">
          <button className="btn btn-secondary" style={{ width: "auto" }} onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={confirmVariant === "danger" ? "btn btn-danger" : "btn btn-primary"}
            style={{ width: "auto" }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
