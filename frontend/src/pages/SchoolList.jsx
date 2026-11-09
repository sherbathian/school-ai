import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { canCreateSchool, canManageSchool } from "../lib/permissions";
import { listSchools } from "../lib/schoolsApi";

export default function SchoolList() {
  const { user } = useAuth();
  const location = useLocation();
  const notice = location.state?.notice;
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    listSchools({ signal: controller.signal })
      .then((schools) => setState({ status: "ok", schools }))
      .catch((error) => {
        // A cancelled request is not a real error.
        if (error.code === "ERR_CANCELED") return;
        setState({ status: "error" });
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((count) => count + 1);
  };

  return (
    <div className="container">
      <div className="topbar">
        <h1>Schools</h1>
        {canCreateSchool(user) && (
          <Link to="/schools/new" className="btn btn-primary">
            New school
          </Link>
        )}
      </div>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {state.status === "loading" && <p role="status">Loading schools…</p>}

      {state.status === "error" && (
        <div role="alert" className="card">
          <p>We couldn't load the schools.</p>
          <button className="btn" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {state.status === "ok" && state.schools.length === 0 && (
        <p className="card empty">
          {user.is_super_admin
            ? "No schools yet."
            : "Your account isn't linked to a school yet. Ask an administrator."}
        </p>
      )}

      {state.status === "ok" && state.schools.length > 0 && (
        <div className="card">
          <table>
            <caption className="sr-only">Schools</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.schools.map((school) => (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td>
                    {school.status === "inactive" ? "Inactive" : "Active"}
                  </td>
                  <td>{school.phone || "—"}</td>
                  <td>{school.email || "—"}</td>
                  <td>
                    {canManageSchool(user, school.id) && (
                      <div className="row-actions">
                        <Link
                          to={`/schools/${school.id}/edit`}
                          className="link"
                          aria-label={`Edit ${school.name}`}
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/schools/${school.id}/members`}
                          className="link"
                          aria-label={`Members of ${school.name}`}
                        >
                          Members
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
