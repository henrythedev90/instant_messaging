"use client";
import React, { useEffect } from "react";
import { ImUser } from "../../../backend/types/types";
import ContactList from "../../../backend/components/Contact/ContactList";
import AddContact from "../../../backend/components/Contact/AddContact";
import LogOut from "../../../backend/components/LogOut/LogOut";
import { useRouter } from "next/navigation";

export default function Dashboard({ user }: { user: ImUser }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user?.username) {
      router.push("/login");
    }
  }, [user, router]);

  return (
    <div>
      <h1>{user.username}</h1>
      <ContactList />
      <AddContact />
      <LogOut />
    </div>
  );
}
