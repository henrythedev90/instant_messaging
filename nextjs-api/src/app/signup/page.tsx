"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function SignUp() {
  const [error, setError] = useState("");
  const [values, setValues] = useState({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });

  const router = useRouter();

  const handleChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (values.password !== values.confirmPassword) {
        setError("Password does not match");
        return;
      }
      await axios.post("/api/signup", {
        email: values.email,
        username: values.username,
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password,
      });
      setValues({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        username: "",
      });

      alert("Congrats! Your account has been created");
      router.push("/login");
    } catch (err) {
      console.error("Error signing up:", err);
    }
  };
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label>First Name</label>
          <input
            type="text"
            name="firstName"
            value={values.firstName}
            onChange={handleChanges}
            required
          />
        </div>
        <div>
          <label>Last Name</label>
          <input
            type="text"
            name="lastName"
            value={values.lastName}
            onChange={handleChanges}
            required
          />
        </div>
        <div>
          <label>username</label>
          <input
            type="text"
            name="username"
            value={values.username}
            onChange={handleChanges}
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="text"
            name="email"
            value={values.email}
            onChange={handleChanges}
            required
          />
        </div>
        <div>
          <label>password</label>
          <input
            type="password"
            name="password"
            value={values.password}
            onChange={handleChanges}
            required
          />
        </div>
        <div>
          <label>confirm password</label>
          <input
            type="password"
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={handleChanges}
            required
          />
        </div>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}
