import { useAuth } from "../context/AuthContext";
import HealthStatus from "../components/HealthStatus";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="container">
      <div className="card">
        <h1>Welcome, {user.name}</h1>
        <p>Role: {user.role}</p>
        <HealthStatus />
        <button className="btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
