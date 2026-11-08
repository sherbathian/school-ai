import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

return (
  <div className="container">
    <div className="card">
      <h1>Welcome, {user.name}</h1>
      <p>Role: {user.role}</p>
      {["admin", "teacher"].includes(user.role) && (
        <p>
          <Link to="/students" className="link">
            Manage Students
          </Link>
        </p>
      )}
      <button className="btn" onClick={logout}>
        Logout
      </button>
    </div>
  </div>
);
}
