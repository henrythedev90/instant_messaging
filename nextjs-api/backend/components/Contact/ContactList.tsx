import { useState, useEffect } from "react";
import { useContacts } from "../../context/ContactProvider";
import axios from "axios";
import { useAuth } from "../../hooks/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { Contact } from "../../types/types";

const SOCKET_SERVER_URL = "http://localhost:3001";

export default function ContactList() {
  const [isLoading, setIsLoading] = useState(true);
  const { contacts, setContacts } = useContacts();
  const { token, refreshToken, userId } = useAuth();
  const { socket, onlineUsers, connected } = useSocket(); // Added 'connected' here

  // Debug auth state whenever it changes
  useEffect(() => {
    console.log("Auth state in ContactList:", {
      userId,
      hasToken: !!token,
      contactsCount: contacts?.length || 0,
    });
  }, [userId, token, contacts]);

  // Debug socket connection
  useEffect(() => {
    console.log("Socket state in ContactList:", {
      socketExists: !!socket,
      connected,
      onlineUsersCount: onlineUsers?.length || 0,
    });
  }, [socket, connected, onlineUsers]);

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
        } catch (error) {
          console.error("Error refreshing token:", error);
          setIsLoading(false);
        }
      } else {
        console.error("Error fetching contacts:", error);
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      console.log("No token available, skipping contact fetch");
      setIsLoading(false);
      return;
    }

    fetchContacts();
  }, [token]);

  const isContactOnline = (contactId: string) => {
    if (!connected || !onlineUsers || onlineUsers.length === 0) {
      return false;
    }

    // Log for debugging
    console.log("Checking if contact is online:", {
      contactId,
      onlineUsers: onlineUsers.map((u) =>
        typeof u === "object" ? u.userId : u
      ),
    });

    return onlineUsers.some((item) => {
      // If item has userId property (most likely case based on your code)
      if (item && typeof item === "object" && "userId" in item) {
        const match = String(item.userId) === String(contactId);
        if (match) console.log(`Match found: ${item.userId} = ${contactId}`);
        return match;
      }

      // For simple string/number IDs
      if (typeof item === "string" || typeof item === "number") {
        const match = String(item) === String(contactId);
        if (match) console.log(`Match found: ${item} = ${contactId}`);
        return match;
      }

      return false;
    });
  };

  return (
    <>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {contacts && contacts.length > 0 ? (
            contacts.map((contact: Contact) => (
              <li key={contact.contactId.toString()}>
                <div>
                  <span>{contact.contactUsername}</span>
                  {isContactOnline(contact.contactId.toString()) && (
                    <span style={{ color: "green", marginLeft: "5px" }}>
                      ● Online
                    </span>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li>No contacts found</li>
          )}
        </ul>
      )}
    </>
  );
}
