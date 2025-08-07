import React, { useState } from "react";
import axios from "axios";
import "./Register.css";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const register_user = async (e) => {
    e.preventDefault();

    if (!password || !email) {
      alert("Please fill in all fields");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          email,
          password,
        }
      );
      alert("Registration successful, kindly login.");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      if (error.response?.status === 409) {
        alert("This email is already registered. Please login.");
      } else {
        alert("An unexpected error occurred during registration.");
      }
      navigate("/login");
    }

    setEmail("");
    setPassword("");
  };

  return (
    <div className="registerUser">
      <form className="register-form" onSubmit={register_user}>
        <h2 className="reg">Register</h2>
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Submit</button>
        <p className="oldUser-below">
          Existing user?
          <span className="meme" onClick={() => navigate("/login")}>
            Login
          </span>
        </p>
      </form>
    </div>
  );
};

export default Register;
