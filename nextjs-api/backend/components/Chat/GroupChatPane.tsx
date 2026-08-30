"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { GroupChat, GroupChatMessage } from "../../types/types";
import { useAuth } from "../../hooks/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { asId } from "../../utils/ids";
import { serializeGroupMessage } from "../../utils/groups";

function messageTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function GroupChatPane({ group }: { group: GroupChat }) {
  const { userId, token } = useAuth();
  const { socket, connected, groupMessages, addGroupMessage } = useSocket();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<GroupChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const groupId = asId(group._id);

  useEffect(() => {
    setPending([]);
    if (!socket || !token || !groupId) {
      return;
    }
    socket.emit("joinGroupRoom", { group, token });
  }, [socket, token, groupId]);

  const thread = useMemo(() => {
    return [...groupMessages, ...pending]
      .filter((message) => asId(message.groupId) === groupId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [groupId, groupMessages, pending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, groupId]);

  useEffect(() => {
    setPending((current) =>
      current.filter(
        (item) =>
          !groupMessages.some(
            (message) =>
              asId(message.groupId) === groupId &&
              message.text === item.text &&
              asId(message.senderId) === asId(item.senderId)
          )
      )
    );
  }, [groupId, groupMessages]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !token || !userId) {
      return;
    }

    const local: GroupChatMessage = {
      _id: `local-${Date.now()}` as unknown as GroupChatMessage["_id"],
      groupId: groupId as unknown as GroupChatMessage["groupId"],
      senderId: userId as unknown as GroupChatMessage["senderId"],
      senderUsername: "You",
      text,
      timestamp: new Date(),
      readBy: [],
    };

    setSending(true);
    setPending((current) => [...current, local]);
    setDraft("");

    try {
      const res = await axios.post(
        "/api/messages/group/add-message-to-group",
        { groupId, text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const saved = serializeGroupMessage(res.data.newMessage);
      addGroupMessage(saved);
      socket?.emit("relayGroupMessage", {
        message: saved,
        memberIds: group.members.map((member) => asId(member.userId)),
      });
    } catch (error) {
      console.error("Failed to send group message:", error);
      setPending((current) =>
        current.filter((item) => asId(item._id) !== asId(local._id))
      );
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const memberLabel = group.members
    .map((member) => member.username)
    .join(", ");

  return (
    <section className="chat-pane">
      <header className="chat-header">
        <div className="avatar">
          {group.groupName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2>{group.groupName}</h2>
          <div className="status-pill">
            {group.members.length} members · {memberLabel}
          </div>
        </div>
      </header>

      <div className="chat-messages">
        {thread.length === 0 ? (
          <p className="empty">No messages yet. Say hello to the group.</p>
        ) : (
          thread.map((message) => {
            const mine = asId(message.senderId) === asId(userId);
            return (
              <div
                key={asId(message._id)}
                className={`bubble ${mine ? "mine" : "theirs"}`}
              >
                {!mine && (
                  <span className="bubble-sender">{message.senderUsername}</span>
                )}
                <p>{message.text}</p>
                <time>{messageTime(message.timestamp)}</time>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-composer" onSubmit={send}>
        <input
          type="text"
          placeholder={`Message ${group.groupName}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!connected}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!draft.trim() || sending || !connected}
        >
          Send
        </button>
      </form>
    </section>
  );
}
