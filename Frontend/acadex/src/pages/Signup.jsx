import { useRef, useState } from "react";
import { API_URL } from "../utils/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import Captcha from "../components/Captcha";
import "./Signup.css";

const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { key: "special", label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function storeSession(data) {
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("userId", data.user.id);
  localStorage.setItem("userName", data.user.name);
  localStorage.setItem("username", data.user.username);
  localStorage.setItem("role", data.user.role || "user");
}

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const captchaRef = useRef(null);

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(formData.password),
  }));
  const passwordIsStrong = passwordChecks.every((c) => c.passed);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!passwordIsStrong) {
      setError("Please meet all the password requirements below.");
      return;
    }

    const captchaToken = captchaRef.current?.getToken();

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          captcha_token: captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Signup failed.");
        captchaRef.current?.reset();
        return;
      }

      // Signup issues a token too, so we can log the user straight in
      // instead of making them re-enter their credentials.
      storeSession(data);
      window.location.href = "/home";
    } catch {
      setError("Could not connect to server.");
    } finally {
      setSubmitting(false);
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
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-header">
          <h1>Acadex</h1>
          <p>Create your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setPasswordFocused(true)}
              required
            />
            {(passwordFocused || formData.password) && (
              <ul className="password-checklist">
                {passwordChecks.map((rule) => (
                  <li key={rule.key} className={rule.passed ? "met" : ""}>
                    <span className="check-icon">{rule.passed ? "✓" : "○"}</span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <Captcha ref={captchaRef} />

          {error && <p className="signup-error">{error}</p>}

          <button type="submit" className="signup-btn" disabled={submitting}>
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />

        <p className="login-text">
          Already have an account?{" "}
          <span onClick={() => (window.location.href = "/")}>Login</span>
        </p>
      </div>
    </div>
  );
}
