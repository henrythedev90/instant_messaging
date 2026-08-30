"use client";
import { useAuth } from "../../hooks/AuthContext";

export default function LogOut() {
  const { logout } = useAuth();
  return (
    <button className="btn btn-danger" type="button" onClick={logout}>
      Log out
    </button>
  );
}
