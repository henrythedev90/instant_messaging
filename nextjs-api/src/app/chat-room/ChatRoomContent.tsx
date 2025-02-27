"use client";
import React, { useEffect, useState } from "react";
import { ImUser } from "../../../backend/types/types";
import ContactList from "../../../backend/components/Contact/ContactList";
import AddContact from "../../../backend/components/Contact/AddContact";
import LogOut from "../../../backend/components/LogOut/LogOut";
import { useRouter } from "next/navigation";

export default function ChatRoomContent({ user }: { user: ImUser }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in localStorage
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        // Verify if user data is valid
        if (!user || !user.username) {
          localStorage.removeItem("token"); // Clear invalid token
          router.push("/login");
          return;
        }

        router.push("/chat-room");
        setIsLoading(false);
      } catch (error) {
        console.error("Authentication error:", error);
        localStorage.removeItem("token"); // Clear token on error
        router.push("/login");
      }
    };

    checkAuth();
  }, [user, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{user.username}</h1>
      <ContactList />
      <AddContact />
      <LogOut />
    </div>
  );
}
