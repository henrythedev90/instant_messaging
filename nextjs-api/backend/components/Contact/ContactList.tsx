import React, { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketProvider";
import { useContacts } from "../../context/ContactProvider";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { Contact } from "../../types/types";

export default function ContactList() {
  const [isLoading, setIsLoading] = useState(true);
  const { contacts, setContacts } = useContacts();
  const { onlineUser, setOnlineUser, socket } = useSocket();
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

      setContacts(res.data.contacts);
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
    setIsLoading(true);
    fetchContacts();
    setIsLoading(false);
    socket?.on("new_contact", (newContact) => {
      console.log("New contact received:", newContact);
      setContacts((prevContacts) => [...prevContacts, newContact]);
    });

    // Ensure that the onlineUser state is updated when the socket emits the event
    socket?.on("updateOnlineContacts", (contacts: Contact[]) => {
      console.log("Received updateOnlineContacts event");
      console.log("Contacts received:", contacts);
      if (Array.isArray(contacts)) {
        console.log("Contacts array:", contacts);
        // Update the onlineUser state
        setOnlineUser(contacts.map((contact) => contact.contactUsername)); // Assuming onlineUser is a state variable
      } else {
        console.error("Expected an array of contacts, but received:", contacts);
      }
    });

    return () => {
      socket?.off("new_contact");
      socket?.off("updateOnlineContacts"); // Clean up the event listener
    };
  }, [socket, token]);

  // console.log("Online Users:", onlineUser);
  console.log("Contacts:", contacts);

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {contacts.length > 0 ? (
            contacts.map((contact: Contact) => (
              <li
                key={contact.contactId.toString()}
                className="p-3 bg-white rounded-lg shadow hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">
                    {contact.contactUsername}
                  </span>
                  {onlineUser?.includes(contact.contactId.toString()) && (
                    <span
                      className="w-2 h-2 bg-green-500 rounded-full"
                      title="Online"
                    >
                      hello
                    </span>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="text-center text-gray-500 p-4">No contacts found</li>
          )}
        </ul>
      )}
      <div className="mt-4">
        <h3 className="font-bold">Online Users:</h3>
        <ul>
          {onlineUser?.map((userId) => (
            <li key={userId} className="text-gray-600">
              {userId}
            </li>
          )) || <li className="text-gray-500">No users online</li>}
        </ul>
      </div>
    </div>
  );
}
