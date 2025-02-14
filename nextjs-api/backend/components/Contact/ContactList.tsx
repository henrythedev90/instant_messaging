import React, { useState, useEffect } from "react";
import { useContacts } from "../../context/ContactProvider";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import { Contact } from "../../types/types";

export default function ContactList() {
  const [isLoading, setIsLoading] = useState(true);
  const { contacts, setContacts } = useContacts();
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
  }, [token]);

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
                </div>
              </li>
            ))
          ) : (
            <li className="text-center text-gray-500 p-4">No contacts found</li>
          )}
        </ul>
      )}
    </div>
  );
}
