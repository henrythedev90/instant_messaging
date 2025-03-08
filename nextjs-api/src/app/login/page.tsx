"use client";
import { useState } from "react";
import { useAuth } from "../../../backend/hooks/AuthContext";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import axios from "axios";

export default function LoginPage() {
  const [values, setValues] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const isEmail = values.identifier.includes("@");
      const payload = {
        password: values.password,
        [isEmail ? "email" : "username"]: values.identifier,
      };

      const response = await axios.post("/api/login", payload, { headers });
      const { token: responseToken, userId } = response.data;

      if (responseToken && userId) {
        // Store the token in localStorage
        localStorage.setItem("token", responseToken);

        // Initialize Socket.IO connection with auth token
        const socket: Socket = io("http://localhost:3000", {
          auth: {
            token: responseToken,
          },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Set up socket event listeners
        socket.on("connect", () => {
          console.log("Socket connected successfully with ID:", socket.id);

          // Emit user authenticated event after connection
          socket.emit("userAuthenticated", { userId });
        });

        socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err.message);
          setError(`Socket connection error: ${err.message}`);
        });

        // Call login function from auth context
        login(responseToken, userId);

        // Navigate to chat room after successful login
        router.push("/chat-room");
      } else {
        setError("Login response missing token or userId");
        console.error("Login response missing token or userId");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during login"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Email or Username"
          name="identifier"
          value={values.identifier}
          onChange={handleChanges}
          required
        />
        <input
          type="password"
          placeholder="Password"
          name="password"
          value={values.password}
          onChange={handleChanges}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div>
        <p>New to site?</p>
        <button
          onClick={() => {
            router.push("/signup");
          }}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
