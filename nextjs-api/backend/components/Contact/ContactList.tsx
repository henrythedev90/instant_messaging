import React, { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketProvider";
import { Contact } from "../../types/types";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { ObjectId } from "mongodb";

export default function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { onlineUser, socket } = useSocket();
  const { token, refreshToken } = useAuth();
  console.log(token, "this is the token");

  const fetchContacts = async () => {
    debugger;
    try {
      const res = await axios.get("/api/contacts/get-all-contact", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Fetched contacts:", res.data.contacts);
      console.log("API response:", res.data);
      console.log("Is contacts an array?", Array.isArray(res.data));

      setContacts(res.data.contacts);
      console.log("Contacts:", contacts);
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
        contacts.map((contact: Contact) => (
          <li
            key={contact.contactId.toString()}
            className="p-3 bg-white rounded-lg shadow hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-800">{contact.contactUsername}</span>
              {onlineUser?.includes(contact.contactId.toString()) && (
                <span
                  className="w-2 h-2 bg-green-500 rounded-full"
                  title="Online"
                ></span>
              )}
            </div>
          </li>
        ))
      ) : (
        <li className="text-center text-gray-500 p-4">No contacts found</li>
      )}
    </ul>
  );
}
