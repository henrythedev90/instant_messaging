"use client";
import axios from "axios";
import React, { useState } from "react";
import { useAuth } from "../../hooks/AuthContext";
import { useContacts } from "../../context/ContactProvider";
import { Contact } from "../../types/types";

export default function AddContact({
  onAdded,
}: {
  onAdded?: (contact: Contact) => void;
}) {
  const [contactUsername, setContactUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
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

      setContacts((prevContacts) => [...prevContacts, res.data.contact]);
      setSuccess(`${contactUsername} is now in your contacts.`);
      onAdded?.(res.data.contact);
      setContactUsername("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Could not add contact");
      } else {
        setError("Could not add contact");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <p className="muted">
        Enter a username that already has an account.
      </p>
      {error && <div className="banner banner-error">{error}</div>}
      {success && <div className="banner banner-success">{success}</div>}
      <div className="field">
        <label htmlFor="contactUsername">Username</label>
        <input
          id="contactUsername"
          type="text"
          value={contactUsername}
          onChange={(e) => setContactUsername(e.target.value)}
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add contact"}
      </button>
    </form>
  );
}
