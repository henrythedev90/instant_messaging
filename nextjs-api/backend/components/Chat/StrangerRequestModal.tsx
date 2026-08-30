"use client";
import { MessageRequest } from "../../types/types";

export default function StrangerRequestModal({
  request,
  remaining,
  busy,
  onAccept,
  onDeny,
}: {
  request: MessageRequest;
  remaining: number;
  busy: boolean;
  onAccept: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stranger-request-title"
      >
        <div className="modal-identity">
          <div className="avatar">
            {request.fromUsername.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="muted">Message from a stranger</p>
            <h2 id="stranger-request-title">{request.fromUsername}</h2>
          </div>
        </div>
        <p className="lede">
          You are receiving a message from someone who is not in your contacts.
          Accept to add them and open the chat, or decline to turn them away.
        </p>
        {request.preview && (
          <blockquote className="preview-quote">{request.preview}</blockquote>
        )}
        {remaining > 1 && (
          <p className="muted">{remaining - 1} more request{remaining - 1 === 1 ? "" : "s"} waiting</p>
        )}
        <div className="modal-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onDeny}
            disabled={busy}
          >
            Decline
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={onAccept}
            disabled={busy}
          >
            {busy ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
