import { useState } from "react";
import { API_URL } from "../utils/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import ReCAPTCHA from "react-google-recaptcha";
import "./Login.css";

function storeSession(data) {
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("userId", data.user.id);
  localStorage.setItem("userName", data.user.name);
  localStorage.setItem("username", data.user.username);
  localStorage.setItem("role", data.user.role || "user");
}

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [captchaToken, setCaptchaToken] = useState(null);

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  ...formData,
  recaptcha_token: captchaToken,
}),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed.");
        return;
      }

      storeSession(data);
      window.location.href = "/home";
    } catch {
      setError("Could not connect to server.");
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Google sign-in failed.");
        return;
      }

      storeSession(data);
      window.location.href = "/home";
    } catch {
      setError("Could not connect to server.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Acadex</h1>
          <p>Welcome back</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <ReCAPTCHA
  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
  onChange={(token) => setCaptchaToken(token)}
/>

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />

        <p className="signup-text">
          Don't have an account?{" "}
          <span onClick={() => (window.location.href = "/signup")}>
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
