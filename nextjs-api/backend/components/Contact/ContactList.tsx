import React, { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketProvider";
import { Contact } from "../../types/types";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { Contact as ContactType } from "../../types/types";

export default function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { onlineUser, socket } = useSocket();
  const { token, refreshToken } = useAuth();
  console.log(token, "this is the token");

  const fetchContacts = async () => {
    try {
      const res = await axios.get("/api/contacts/get-all-contact", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Fetched contacts:", res.data);
      setContacts(res.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          await refreshToken();
          fetchContacts();
        } catch (error) {
          console.error("Error refreshing token:", error);
        }
      } else {
        console.error("Error fetching contacts:", error);
      }
    }
  };

  useEffect(() => {
    console.log(token, "this is the token");
    if (!token) return;

    fetchContacts();
    // Listen for new contact events
    socket?.on("new_contact", () => {
      fetchContacts();
    });

    return () => {
      socket?.off("new_contact");
    };
  }, [socket, token]);

  // console.log("Online Users:", onlineUser);
  console.log("Contacts:", contacts);

  return (
    <ul className="flex flex-col gap-2">
      {contacts.length > 0 ? (
        contacts.map((contact: ContactType) => (
          <li
            key={contact.contactId.toString()}
            className="flex items-center justify-between p-3 bg-white rounded-lg shadow hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-800">
              {contact.contactUsername}
            </span>
            {/* <span
              className={`text-xs px-2 py-1 rounded-full ${
                onlineUser.includes(contact.contactId.toString())
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {onlineUser.includes(contact.contactId.toString())
                ? "Online"
                : "Offline"}
            </span> */}
          </li>
        ))
      ) : (
        <li className="text-center text-gray-500 p-4">hello</li>
      )}
    </ul>
  );
}
