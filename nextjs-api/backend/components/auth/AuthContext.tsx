"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  login: (newToken: string, userId: string) => void;
  isLogginOut: boolean;
  refreshToken: () => Promise<string | null>;
  refreshTokenString: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  });

  const [refreshTokenString, setRefreshTokenString] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("refreshToken");
      }
      return null;
    }
  );
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const refreshToken = async (): Promise<string | null> => {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) return null;
    try {
      const res = await axios.post("/api/auth/refresh-token", {
        refreshToken: storedRefreshToken,
      });
      const newAccessToken = res.data.token;
      localStorage.setItem("token", newAccessToken);
      setToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  };

  const login = async (newToken: string, newRefreshToken: string) => {
    try {
      localStorage.setItem("token", newToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      setToken(newToken);
      setRefreshTokenString(newRefreshToken);
      router.push(`/chat-room`);
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setToken(null);
      setRefreshTokenString(null);
      setIsLoggingOut(true);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        logout,
        login,
        isLogginOut: isLoggingOut,
        refreshToken,
        refreshTokenString,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    debugger;
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
