"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token, logout, isLogginOut } = useAuth();

  useEffect(() => {
    const handleLogout = () => {
      logout();
      router.push("/login");
    };

    window.addEventListener("logout", handleLogout);

    return () => {
      window.removeEventListener("logout", handleLogout);
    };
  }, [router, logout]);

  if (!token && !isLogginOut) {
    return null;
  }
  return <>{children}</>;
}
