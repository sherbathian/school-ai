import { useAuth } from "../context/useAuth";
import HealthStatus from "../components/HealthStatus";

export default function Dashboard() {
  const { user, currentSchool, logout } = useAuth();

  return (
    <div className="container">
      <div className="card">
        <h1>Welcome, {user.name}</h1>
        {user.is_super_admin ? (
          <p>Role: super admin</p>
        ) : currentSchool ? (
          <p>
            {currentSchool.name} · Role: {currentSchool.role}
          </p>
        ) : (
          <p role="alert">
            Your account isn't linked to a school yet. Ask an administrator.
          </p>
        )}
        <HealthStatus />
        <button className="btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
