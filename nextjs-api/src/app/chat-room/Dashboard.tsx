"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Contact, ImUser } from "../../../backend/types/types";
import ContactList from "../../../backend/components/Contact/ContactList";
import AddContact from "../../../backend/components/Contact/AddContact";
import ChatPane from "../../../backend/components/Chat/ChatPane";
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

export default function Dashboard({ user }: { user: ImUser }) {
  const router = useRouter();
  const { connected, onlineUsers, incomingRequests, socket, removeIncomingRequest } =
    useSocket();
  const { setContacts } = useContacts();
  const { token } = useAuth();
  const [selected, setSelected] = useState<Contact | null>(null);
  const [responding, setResponding] = useState(false);
  const activeRequest = incomingRequests[0];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user?.username) {
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
        setSelected(res.data.contact);
      }
    } catch (error) {
      console.error("Failed to respond to message request:", error);
    } finally {
      setResponding(false);
    }
  };

  const selectedOnline = Boolean(
    selected &&
      onlineUsers.some(
        (item) => asId(item.userId) === asId(selected.contactId)
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
            <h2>Contacts</h2>
            <ContactList
              selectedId={selected?.contactId.toString()}
              onSelect={setSelected}
            />
            <div className="sidebar-add">
              <h2>Add someone</h2>
              <AddContact onAdded={setSelected} />
            </div>
          </aside>
          <ChatPane contact={selected} online={selectedOnline} />
        </div>
      </section>
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
