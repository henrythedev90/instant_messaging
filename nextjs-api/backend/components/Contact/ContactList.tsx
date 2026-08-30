"use client";
import { useState, useEffect } from "react";
import { useContacts } from "../../context/ContactProvider";
import axios from "axios";
import { useAuth } from "../../hooks/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { Contact } from "../../types/types";
import { asId } from "../../utils/ids";

export default function ContactList({
  selectedId,
  unreadByThread,
  onSelect,
}: {
  selectedId?: string | null;
  unreadByThread?: Record<string, number>;
  onSelect?: (contact: Contact) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { contacts, setContacts } = useContacts();
  const { token, refreshToken } = useAuth();
  const { onlineUsers, connected, typingByThread } = useSocket();

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("/api/contacts/get-all-contact", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setContacts(res.data.contacts);
      setIsLoading(false);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          await refreshToken();
          fetchContacts();
        } catch {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchContacts();
  }, [token]);

  const isContactOnline = (contactId: string) => {
    if (!connected || !onlineUsers || onlineUsers.length === 0) {
      return false;
    }

    return onlineUsers.some((item) => {
      if (item && typeof item === "object" && "userId" in item) {
        return String(item.userId) === String(contactId);
      }
      if (typeof item === "string" || typeof item === "number") {
        return String(item) === String(contactId);
      }
      return false;
    });
  };

  const visibleContacts = (contacts || []).filter((contact) =>
    contact.contactUsername.toLowerCase().includes(query.toLowerCase())
  );

  if (isLoading) {
    return <p className="loading">Loading contacts...</p>;
  }

  return (
    <div>
      <div className="field" style={{ marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Search contacts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search contacts"
        />
      </div>
      {visibleContacts.length > 0 ? (
        <ul className="contact-list">
          {visibleContacts.map((contact: Contact) => {
            const contactId = asId(contact.contactId);
            const online = isContactOnline(contactId);
            const unread = unreadByThread?.[`direct:${contactId}`] || 0;
            const typing = (typingByThread[`direct:${contactId}`] || []).length > 0;
            return (
              <li key={contactId}>
                <button
                  type="button"
                  className={`contact-item ${
                    selectedId === contactId ? "active" : ""
                  } ${unread ? "has-unread" : ""}`}
                  onClick={() => onSelect?.(contact)}
                >
                  <div className="contact-name">
                    <div className="avatar">
                      {contact.contactUsername.slice(0, 2).toUpperCase()}
                      {unread > 0 && (
                        <span className="unread-badge">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                    <span>{contact.nickname || contact.contactUsername}</span>
                  </div>
                  <div className="status-pill">
                    <span className={`status-dot ${online || typing ? "on" : ""}`} />
                    {typing ? "Typing..." : online ? "Online" : "Offline"}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">
          {query
            ? "No contacts match that search."
            : "No contacts yet. Add someone by username."}
        </p>
      )}
    </div>
  );
}
