"use client";
import { useState } from "react";
import { useAuth } from "../../../backend/components/auth/AuthContext";
import { useRouter } from "next/navigation";
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
        Authorization: `Bearer ${token}`,
      };
      const isEmail = values.identifier.includes("@");
      const payload = {
        password: values.password,
        [isEmail ? "email" : "username"]: values.identifier,
      };
      await axios.post("/api/login", payload, { headers }).then((res) => {
        const { token, userId } = res.data;
        localStorage.setItem("token", token);
        login(token, userId);
        router.push("/chat-room");
      });
    } catch (err) {
      setError((err as Error).message);
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
        <p>new to site</p>
      </div>
    </div>
  );
}
