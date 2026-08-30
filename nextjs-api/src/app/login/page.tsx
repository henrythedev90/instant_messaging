"use client";
import { useState } from "react";
import { useAuth } from "../../../backend/hooks/AuthContext";
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
      const isEmail = values.identifier.includes("@");
      const payload = {
        password: values.password,
        [isEmail ? "email" : "username"]: values.identifier,
      };

      const response = await axios.post("/api/login", payload);
      const { token: responseToken, userId } = response.data;

      if (responseToken && userId) {
        await login(responseToken, userId);
      } else {
        setError("Login response missing token or userId");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Could not log in");
      } else {
        setError("An error occurred during login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark">P</div>
          <span>Pulse</span>
        </div>
        <h1>Welcome back</h1>
        <p className="lede">Sign in to see who is online and start chatting.</p>
        {error && <div className="banner banner-error">{error}</div>}
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="identifier">Email or username</label>
            <input
              id="identifier"
              type="text"
              name="identifier"
              autoComplete="username"
              value={values.identifier}
              onChange={handleChanges}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={values.password}
              onChange={handleChanges}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="auth-footer">
          <span>New here?</span>
          <button className="btn btn-ghost" type="button" onClick={() => router.push("/signup")}>
            Create an account
          </button>
        </div>
      </section>
    </main>
  );
}
