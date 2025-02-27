"use client";
import React, { useState } from "react";
import { useRouter } from "next/router";
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
}
