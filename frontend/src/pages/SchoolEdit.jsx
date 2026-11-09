import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SchoolForm from "../components/SchoolForm";
import { useAuth } from "../context/useAuth";
import { errorMessage } from "../lib/apiErrors";
import { canDeleteSchool, canManageSchool } from "../lib/permissions";
import { deleteSchool, getSchool, updateSchool } from "../lib/schoolsApi";

// The API sends null for empty fields; inputs need strings.
function toFormValues(school) {
  return {
    name: school.name ?? "",
    url: school.url ?? "",
    phone: school.phone ?? "",
    email: school.email ?? "",
    address: school.address ?? "",
    about: school.about ?? "",
    status: school.status ?? "active",
  };
}

export default function SchoolEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const schoolId = Number(id);

  // Check permission before loading anything, so nothing is fetched needlessly.
  if (!canManageSchool(user, schoolId)) {
    return (
      <div className="container">
        <p role="alert">Access denied.</p>
      </div>
    );
  }

  return <EditLoader schoolId={schoolId} />;
}

function EditLoader({ schoolId }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteButton = useRef(null);
  const cancelButton = useRef(null);

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

  // When the confirmation opens, put focus on the safe choice.
  useEffect(() => {
    if (confirming) cancelButton.current?.focus();
  }, [confirming]);

  const handleSubmit = async (values) => {
    await updateSchool(schoolId, values);
    // The user's school list holds names too; reload it so they don't go stale.
    await refreshUser().catch(() => {});
    navigate("/schools", { state: { notice: "School saved." } });
  };

  const cancelDelete = () => {
    setConfirming(false);
    setDeleteError("");
    deleteButton.current?.focus();
  };

  const handleDelete = async () => {
    setDeleteError("");
    try {
      await deleteSchool(schoolId);
      navigate("/schools", { state: { notice: "School deleted." } });
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  return (
    <div className="container">
      <h1>Edit school</h1>

      {state.status === "loading" && <p role="status">Loading school…</p>}

      {state.status === "error" && <p role="alert">{state.message}</p>}

      {state.status === "ok" && (
        <>
          <SchoolForm
            key={state.school.id}
            initialValues={toFormValues(state.school)}
            onSubmit={handleSubmit}
            submitLabel="Save changes"
            showStatus={Boolean(user.is_super_admin)}
          />

          {canDeleteSchool(user) && (
            <div className="card">
              <h2>Delete school</h2>
              <p>
                Deleting hides the school, and its members lose access to it.
              </p>
              <button
                ref={deleteButton}
                className="btn btn-danger"
                aria-expanded={confirming}
                onClick={() => setConfirming(true)}
              >
                Delete school
              </button>

              {confirming && (
                <section
                  aria-labelledby="confirm-delete-title"
                  className="danger"
                >
                  <h3 id="confirm-delete-title">Delete {state.school.name}?</h3>
                  <p>
                    This can't be undone from the app. Members will lose access
                    right away.
                  </p>
                  {deleteError && (
                    <p role="alert" className="error">
                      {deleteError}
                    </p>
                  )}
                  <button className="btn btn-danger" onClick={handleDelete}>
                    Yes, delete school
                  </button>
                  <button
                    ref={cancelButton}
                    className="btn btn-secondary"
                    onClick={cancelDelete}
                  >
                    Cancel
                  </button>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
