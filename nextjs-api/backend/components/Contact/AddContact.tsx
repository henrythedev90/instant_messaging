import axios from "axios";
import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../../context/SocketProvider";
export default function AddContact() {
  const [contactUsername, setContactUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { token } = useAuth();
  const socket = useSocket();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      axios
        .post(
          "/api/contacts/add-contact",
          { contactUsername },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        .then((res) => {
          console.log(token, "this is the token");
          socket?.socket.emit("new_contact", res.data);
          console.log(res);
        });
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
