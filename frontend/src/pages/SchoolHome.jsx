import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { errorMessage } from "../lib/apiErrors";
import { canManageSchool } from "../lib/permissions";
import { getSchool } from "../lib/schoolsApi";

export default function SchoolHome() {
  const { id } = useParams();
  const { user } = useAuth();
  const schoolId = Number(id);
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    getSchool(schoolId, { signal: controller.signal })
      .then((school) => setState({ status: "ok", school }))
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setState({
          status: "error",
          message: errorMessage(error, "We couldn't load this school."),
        });
      });

    return () => controller.abort();
  }, [schoolId]);

  return (
    <div className="container">
      <h1>{state.status === "ok" ? state.school.name : "School"}</h1>

      {state.status === "loading" && <p role="status">Loading school…</p>}

      {state.status === "error" && <p role="alert">{state.message}</p>}

      {state.status === "ok" && (
        <div className="card">
          <h2>Academics</h2>
          <ul className="link-list">
            <li>
              <Link to={`/schools/${schoolId}/sections`} className="link">
                Sections
              </Link>
            </li>
            <li>
              <Link to={`/schools/${schoolId}/grades`} className="link">
                Grades
              </Link>
            </li>
          </ul>

          {canManageSchool(user, schoolId) && (
            <>
              <h2>Administration</h2>
              <ul className="link-list">
                <li>
                  <Link to={`/schools/${schoolId}/members`} className="link">
                    Members
                  </Link>
                </li>
                <li>
                  <Link to={`/schools/${schoolId}/edit`} className="link">
                    School details
                  </Link>
                </li>
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
