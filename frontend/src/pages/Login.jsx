import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.errors?.email?.[0] ||
          err.response?.data?.message ||
          "Login failed",
      );
    }
  };

return (
  <form onSubmit={handleSubmit} className="card login-box">
    <h1>School Login</h1>
    {error && <p className="error">{error}</p>}
    <div className="field">
      <label>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
    </div>
    <div className="field">
      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </div>
    <button className="btn btn-primary" style={{ width: "100%" }}>
      Login
    </button>
  </form>
);
}
