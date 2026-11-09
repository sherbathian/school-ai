import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(roles)) return <p role="alert">Access denied.</p>;

  return children;
}
