"use client";
import { useMemo, useState } from "react";
import { Contact } from "../../types/types";
import { asId } from "../../utils/ids";

export default function NewChatModal({
  contacts,
  busy,
  error,
  onClose,
  onStart,
}: {
  contacts: Contact[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onStart: (selected: Contact[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visible = useMemo(
    () =>
      contacts.filter((contact) =>
        contact.contactUsername.toLowerCase().includes(query.toLowerCase())
      ),
    [contacts, query]
  );

  const selectedContacts = contacts.filter((contact) =>
    selectedIds.includes(asId(contact.contactId))
  );

  const toggle = (contactId: string) => {
    setSelectedIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId]
    );
  };

  const hint =
    selectedContacts.length === 0
      ? "Pick one person for a direct chat, or two or more to start a group."
      : selectedContacts.length === 1
        ? `Direct chat with ${selectedContacts[0].contactUsername}.`
        : `This will create a group with ${selectedContacts
            .map((contact) => contact.contactUsername)
            .join(", ")}.`;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
      >
        <div className="modal-identity">
          <div>
            <h2 id="new-chat-title">New chat</h2>
            <p className="muted">{hint}</p>
          </div>
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <input
            type="search"
            placeholder="Search contacts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search contacts"
          />
        </div>
        {error && <div className="banner banner-error">{error}</div>}
        <ul className="picker-list">
          {visible.length === 0 ? (
            <li className="empty">
              {contacts.length === 0
                ? "Add a contact first."
                : "No contacts match that search."}
            </li>
          ) : (
            visible.map((contact) => {
              const id = asId(contact.contactId);
              const checked = selectedIds.includes(id);
              return (
                <li key={id}>
                  <label className={`picker-item ${checked ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(id)}
                    />
                    <div className="avatar">
                      {contact.contactUsername.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{contact.nickname || contact.contactUsername}</span>
                  </label>
                </li>
              );
            })
          )}
        </ul>
        <div className="modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={selectedContacts.length === 0 || busy}
            onClick={() => onStart(selectedContacts)}
          >
            {busy
              ? "Starting..."
              : selectedContacts.length > 1
                ? "Create group"
                : "Start chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
