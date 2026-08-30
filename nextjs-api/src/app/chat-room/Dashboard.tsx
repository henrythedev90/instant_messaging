"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Contact, GroupChat, ImUser } from "../../../backend/types/types";
import ContactList from "../../../backend/components/Contact/ContactList";
import AddContact from "../../../backend/components/Contact/AddContact";
import ChatPane from "../../../backend/components/Chat/ChatPane";
import GroupChatPane from "../../../backend/components/Chat/GroupChatPane";
import NewChatModal from "../../../backend/components/Chat/NewChatModal";
import StrangerRequestModal from "../../../backend/components/Chat/StrangerRequestModal";
import LogOut from "../../../backend/components/LogOut/LogOut";
import { useRouter } from "next/navigation";
import { useSocket } from "../../../backend/hooks/useSocket";
import { useContacts } from "../../../backend/context/ContactProvider";
import { useAuth } from "../../../backend/hooks/AuthContext";
import { asId } from "../../../backend/utils/ids";

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

type ChatTarget =
  | { type: "direct"; contact: Contact }
  | { type: "group"; group: GroupChat }
  | null;

export default function Dashboard({ user }: { user: ImUser }) {
  const router = useRouter();
  const {
    connected,
    onlineUsers,
    incomingRequests,
    socket,
    removeIncomingRequest,
    groups,
    addGroup,
  } = useSocket();
  const { contacts, setContacts } = useContacts();
  const { token } = useAuth();
  const [target, setTarget] = useState<ChatTarget>(null);
  const [responding, setResponding] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [newChatError, setNewChatError] = useState("");
  const activeRequest = incomingRequests[0];

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (!stored || !user?.username) {
      router.push("/login");
    }
  }, [user, router]);

  const respondToRequest = async (action: "accept" | "deny") => {
    if (!activeRequest || !token) {
      return;
    }

    setResponding(true);
    try {
      const res = await axios.post(
        "/api/contacts/respond-message-request",
        { requestId: activeRequest._id, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      removeIncomingRequest(activeRequest._id);
      socket?.emit("resolveMessageRequest", {
        request: res.data.request,
        action,
        contact: res.data.contact,
      });
      if (action === "accept" && res.data.contact) {
        setContacts((prev) => {
          const contactId = asId(res.data.contact.contactId);
          if (prev.some((item) => asId(item.contactId) === contactId)) {
            return prev;
          }
          return [...prev, res.data.contact];
        });
        setTarget({ type: "direct", contact: res.data.contact });
      }
    } catch (error) {
      console.error("Failed to respond to message request:", error);
    } finally {
      setResponding(false);
    }
  };

  const startChat = async (selected: Contact[]) => {
    if (selected.length === 0) {
      return;
    }

    if (selected.length === 1) {
      setTarget({ type: "direct", contact: selected[0] });
      setNewChatOpen(false);
      setNewChatError("");
      return;
    }

    if (!token) {
      return;
    }

    setStarting(true);
    setNewChatError("");
    try {
      const res = await axios.post(
        "/api/messages/group/create-group-chat",
        {
          members: selected.map((contact) => contact.contactUsername),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const group = res.data.group as GroupChat;
      addGroup(group);
      if (!res.data.existing) {
        socket?.emit("announceGroup", group);
      }
      setTarget({ type: "group", group });
      setNewChatOpen(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setNewChatError(
          error.response?.data?.message || "Could not start group chat"
        );
      } else {
        setNewChatError("Could not start group chat");
      }
    } finally {
      setStarting(false);
    }
  };

  const selectedContact =
    target?.type === "direct" ? target.contact : null;
  const selectedGroup = target?.type === "group" ? target.group : null;
  const selectedOnline = Boolean(
    selectedContact &&
      onlineUsers.some(
        (item) => asId(item.userId) === asId(selectedContact.contactId)
      )
  );

  return (
    <main className="app-shell">
      <section className="dashboard">
        <header className="dash-header">
          <div className="user-meta">
            <div className="avatar">{initials(user.username)}</div>
            <div>
              <h1>{user.username}</h1>
              <div className="status-pill">
                <span className={`status-dot ${connected ? "on" : ""}`} />
                {connected ? "Connected" : "Connecting..."}
              </div>
            </div>
          </div>
          <LogOut />
        </header>
        <div className="dash-body">
          <aside className="panel sidebar">
            <button
              className="btn btn-primary new-chat-btn"
              type="button"
              onClick={() => {
                setNewChatError("");
                setNewChatOpen(true);
              }}
            >
              New chat
            </button>
            <h2>Chats</h2>
            <ContactList
              selectedId={
                selectedContact ? asId(selectedContact.contactId) : null
              }
              onSelect={(contact) =>
                setTarget({ type: "direct", contact })
              }
            />
            {groups.length > 0 && (
              <div className="sidebar-groups">
                <h2>Groups</h2>
                <ul className="contact-list">
                  {groups.map((group) => {
                    const id = asId(group._id);
                    const active =
                      selectedGroup && asId(selectedGroup._id) === id;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`contact-item ${active ? "active" : ""}`}
                          onClick={() => setTarget({ type: "group", group })}
                        >
                          <div className="contact-name">
                            <div className="avatar">
                              {group.groupName.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{group.groupName}</span>
                          </div>
                          <div className="status-pill">
                            {group.members.length}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="sidebar-add">
              <h2>Add someone</h2>
              <AddContact
                onAdded={(contact) =>
                  setTarget({ type: "direct", contact })
                }
              />
            </div>
          </aside>
          {selectedGroup ? (
            <GroupChatPane group={selectedGroup} />
          ) : (
            <ChatPane contact={selectedContact} online={selectedOnline} />
          )}
        </div>
      </section>
      {newChatOpen && (
        <NewChatModal
          contacts={contacts}
          busy={starting}
          error={newChatError}
          onClose={() => setNewChatOpen(false)}
          onStart={startChat}
        />
      )}
      {activeRequest && (
        <StrangerRequestModal
          request={activeRequest}
          remaining={incomingRequests.length}
          busy={responding}
          onAccept={() => respondToRequest("accept")}
          onDeny={() => respondToRequest("deny")}
        />
      )}
    </main>
  );
}
