import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.errors?.email?.[0] ||
          (err.response?.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : "") ||
          err.response?.data?.message ||
          "Login failed",
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card login-box">
      <h1>School Login</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        className="btn btn-primary"
        style={{ width: "100%" }}
        disabled={submitting}
      >
        {submitting ? "Signing in…" : "Login"}
      </button>
    </form>
  );
}
