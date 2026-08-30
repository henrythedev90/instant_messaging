"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Contact, Message } from "../../types/types";
import { useAuth } from "../../hooks/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { asId, normalizeMessage } from "../../utils/ids";

function messageTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatPane({
  contact,
  online,
}: {
  contact: Contact | null;
  online: boolean;
}) {
  const { userId, token } = useAuth();
  const {
    socket,
    connected,
    privateMessages,
    addPrivateMessage,
    requestOutcomes,
    setRequestOutcome,
  } = useSocket();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPending([]);
    if (!socket || !token || !contact) {
      return;
    }
    socket.emit("joinPrivateRoom", asId(contact.contactId), token);
  }, [socket, token, contact?.contactId]);

  const thread = useMemo(() => {
    if (!contact || !userId) {
      return [];
    }
    const otherId = asId(contact.contactId);
    const me = asId(userId);
    return [...privateMessages, ...pending]
      .filter((message) => {
        const sender = asId(message.sender);
        const receiver = asId(message.receiver);
        return (
          (sender === me && receiver === otherId) ||
          (sender === otherId && receiver === me)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [contact, pending, privateMessages, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, contact?.contactId]);

  useEffect(() => {
    setPending((current) =>
      current.filter(
        (item) =>
          !privateMessages.some(
            (message) =>
              String(message.content) === item.content &&
              asId(message.sender) === asId(item.sender)
          )
      )
    );
  }, [privateMessages]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !token || !contact || !userId) {
      return;
    }

    const payload: Message = {
      _id: `local-${Date.now()}` as unknown as Message["_id"],
      sender: userId as unknown as Message["sender"],
      receiver: asId(contact.contactId) as unknown as Message["receiver"],
      content,
      timestamp: new Date(),
      read: false,
    };

    setSending(true);
    setPending((current) => [...current, payload]);
    setDraft("");

    try {
      const res = await axios.post(
        "/api/messages/send",
        {
          receiver: asId(contact.contactId),
          content,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const saved = normalizeMessage(res.data.savedMessage) as Message;
      addPrivateMessage(saved);
      if (res.data.requiresApproval) {
        setRequestOutcome(asId(contact.contactId), "pending");
      }
      socket?.emit("relayPrivateMessage", {
        savedMessage: saved,
        requiresApproval: Boolean(res.data.requiresApproval),
        request: res.data.request,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setPending((current) =>
        current.filter((item) => asId(item._id) !== asId(payload._id))
      );
      setDraft(content);
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        /declined/i.test(String(error.response.data?.message))
      ) {
        setRequestOutcome(asId(contact.contactId), "denied");
      }
    } finally {
      setSending(false);
    }
  };

  const requestStatus = contact
    ? requestOutcomes[asId(contact.contactId)]
    : undefined;
  const denied = requestStatus === "denied";
  const awaitingAccept = requestStatus === "pending";

  if (!contact) {
    return (
      <section className="chat-pane">
        <div className="chat-empty">
          <h2>Start a chat</h2>
          <p className="muted">
            Choose someone from your contacts to open a thread.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-pane">
      <header className="chat-header">
        <div className="avatar">
          {contact.contactUsername.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2>{contact.nickname || contact.contactUsername}</h2>
          <div className="status-pill">
            <span className={`status-dot ${online ? "on" : ""}`} />
            {online ? "Online" : "Offline"}
          </div>
        </div>
      </header>

      <div className="chat-messages">
        {thread.length === 0 ? (
          <p className="empty">No messages yet. Say hello.</p>
        ) : (
          thread.map((message: Message) => {
            const mine = asId(message.sender) === asId(userId);
            return (
              <div
                key={String(message._id)}
                className={`bubble ${mine ? "mine" : "theirs"}`}
              >
                <p>{message.content}</p>
                <time>{messageTime(message.timestamp)}</time>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {awaitingAccept && (
        <p className="chat-notice">
          Waiting for {contact.contactUsername} to accept your message.
        </p>
      )}
      {denied && (
        <p className="chat-notice denied">
          {contact.contactUsername} declined your message request.
        </p>
      )}
      <form className="chat-composer" onSubmit={send}>
        <input
          type="text"
          placeholder={
            denied
              ? "This request was declined"
              : `Message ${contact.contactUsername}`
          }
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!connected || denied}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!draft.trim() || sending || !connected || denied}
        >
          Send
        </button>
      </form>
    </section>
  );
}
