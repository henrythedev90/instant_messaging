"use client";
import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../backend/components/auth/ProtectedRoute";
import axios from "axios";
import { SocketProvider } from "../../../backend/context/SocketProvider";
import { useAuth } from "../../../backend/components/auth/AuthContext";
import { ImUser } from "../../../backend/types/types";
import ChatRoomContent from "./ChatRoomContent";
import { ContactsProvider } from "../../../backend/context/ContactProvider";
export default function ChatRoom() {
  const [users, setUsers] = useState<{ user: ImUser } | null>(null);
  const { token, refreshToken } = useAuth(); // Add refreshToken to useAuth

  const fetchUserData = async (authToken: string) => {
    try {
      const res = await axios.get("/api/auth", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setUsers(res.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Try to refresh the token
        const newToken = await refreshToken();
        if (newToken) {
          // Retry the original request with new token
          await fetchUserData(newToken);
        } else {
          // If refresh fails, redirect to login
          window.location.href = "/login";
        }
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserData(token);
    }
  }, [token]);

  return (
    <ProtectedRoute>
      <ContactsProvider>
        <SocketProvider userId={users?.user?._id?.toString() || ""}>
          {users && <ChatRoomContent user={users.user} />}
        </SocketProvider>
      </ContactsProvider>
    </ProtectedRoute>
  );
}
