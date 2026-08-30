"use client";

export default function MessageAlertToast({
  title,
  preview,
  onOpen,
  onDismiss,
}: {
  title: string;
  preview: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="message-toast" role="status" aria-live="polite">
      <button className="message-toast-body" type="button" onClick={onOpen}>
        <p className="message-toast-label">New message</p>
        <strong>{title}</strong>
        <p className="muted">{preview}</p>
      </button>
      <button
        className="message-toast-close"
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
