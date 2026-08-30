"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token, logout, isLoggingOut } = useAuth();

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

  useEffect(() => {
    if (!token && !isLoggingOut) {
      router.push("/login");
    }
  }, [token, isLoggingOut, router]);

  if (!token && !isLoggingOut) {
    return null;
  }
  return <>{children}</>;
}
