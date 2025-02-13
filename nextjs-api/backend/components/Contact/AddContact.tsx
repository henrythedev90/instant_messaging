import axios from "axios";
import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../../context/SocketProvider";
import { useContacts } from "../../context/ContactProvider"; // Import here

export default function AddContact() {
  const [contactUsername, setContactUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  // const [showModal, setShowModal] = useState(false);
  const { token } = useAuth();
  const socket = useSocket();
  const { setContacts } = useContacts();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.post(
        "/api/contacts/add-contact",
        { contactUsername },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newContact = res.data.contact;
      console.log(newContact, "this is the new contact");

      // Optimistically update UI
      setContacts((prevContacts) => [...prevContacts, res.data.contact]);

      // Emit socket event
      socket?.socket.emit("new_contact", newContact);

      setSuccess("Contact added successfully!");
    } catch (error) {
      console.error("Error adding contact:", error);
      setError("Error adding contact");
    } finally {
      setLoading(false);
      setContactUsername("");
    }
  };

  return (
    <div>
      <h1>Add Contact</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={contactUsername}
          onChange={(e) => setContactUsername(e.target.value)}
        />
        <button type="submit">Add Contact</button>
      </form>
    </div>
  );
}
