import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="navbar">
        <nav aria-label="Main" className="topbar container">
          <div className="nav-links">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/schools">Schools</NavLink>
          </div>
          <div className="nav-user">
            <span>{user.name}</span>
            <NavLink to="/account/password">Change password</NavLink>
            <button className="btn btn-small" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
