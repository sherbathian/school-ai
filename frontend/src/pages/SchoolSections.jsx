import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ConfirmPanel from "../components/ConfirmPanel";
import SectionForm from "../components/SectionForm";
import { useAuth } from "../context/useAuth";
import { sectionsApi } from "../lib/academicApi";
import { errorMessage, firstErrorMessage } from "../lib/apiErrors";
import { canManageSchool } from "../lib/permissions";
import { getSchool } from "../lib/schoolsApi";

const byTitle = (a, b) =>
  a.title.localeCompare(b.title, undefined, { numeric: true });

const emptySection = { title: "", status: "active" };

export default function SchoolSections() {
  const { id } = useParams();
  const { user } = useAuth();
  const schoolId = Number(id);
  const canEdit = canManageSchool(user, schoolId);

  const [state, setState] = useState({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // a section, or null for "add"
  const [formKey, setFormKey] = useState(0);
  const [focusForm, setFocusForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const headingRef = useRef(null);
  const editTrigger = useRef(null);
  const deleteTrigger = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getSchool(schoolId, { signal: controller.signal }),
      sectionsApi.list(schoolId, { signal: controller.signal }),
    ])
      .then(([school, sections]) =>
        setState({
          status: "ok",
          school,
          sections: [...sections].sort(byTitle),
        }),
      )
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setState({
          status: "error",
          message: errorMessage(error, "We couldn't load the sections."),
        });
      });

    return () => controller.abort();
  }, [schoolId]);

  // A new key makes React build the form again with fresh starting values.
  const resetForm = () => setFormKey((key) => key + 1);

  const startEditing = (section, event) => {
    editTrigger.current = event.currentTarget;
    setNotice("");
    setEditing(section);
    setFocusForm(true);
    resetForm();
  };

  const cancelEditing = () => {
    setEditing(null);
    setFocusForm(false);
    resetForm();
    editTrigger.current?.focus();
  };

  const handleSave = async (values) => {
    setNotice("");

    if (editing) {
      const updated = await sectionsApi.update(schoolId, editing.id, values);
      setState((current) => ({
        ...current,
        sections: current.sections
          .map((section) => (section.id === updated.id ? updated : section))
          .sort(byTitle),
      }));
      setNotice(`Section ${updated.title} was saved.`);
      setEditing(null);
      setFocusForm(false);
      resetForm();
      headingRef.current?.focus();
    } else {
      const created = await sectionsApi.create(schoolId, values);
      setState((current) => ({
        ...current,
        sections: [...current.sections, created].sort(byTitle),
      }));
      setNotice(`Section ${created.title} was added.`);
      setFocusForm(true); // ready for the next one
      resetForm();
    }
  };

  const askToDelete = (section, event) => {
    deleteTrigger.current = event.currentTarget;
    setNotice("");
    setDeleteError("");
    setDeleting(section);
  };

  const cancelDelete = () => {
    setDeleting(null);
    setDeleteError("");
    deleteTrigger.current?.focus();
  };

  const confirmDelete = async () => {
    const section = deleting;
    setDeleteError("");

    try {
      await sectionsApi.remove(schoolId, section.id);
      setState((current) => ({
        ...current,
        sections: current.sections.filter((s) => s.id !== section.id),
      }));
      if (editing?.id === section.id) {
        setEditing(null);
        setFocusForm(false);
        resetForm();
      }
      setDeleting(null);
      setNotice(`Section ${section.title} was deleted.`);
      // The row that had focus is gone, so keep the user's place on the heading.
      headingRef.current?.focus();
    } catch (error) {
      setDeleteError(firstErrorMessage(error));
    }
  };

  return (
    <div className="container">
      <h1 ref={headingRef} tabIndex={-1}>
        {state.status === "ok"
          ? `Sections of ${state.school.name}`
          : "Sections"}
      </h1>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {state.status === "loading" && <p role="status">Loading sections…</p>}

      {state.status === "error" && <p role="alert">{state.message}</p>}

      {state.status === "ok" && (
        <>
          {state.sections.length === 0 ? (
            <p className="card empty">
              No sections yet.{canEdit ? " Add the first one below." : ""}
            </p>
          ) : (
            <div className="card">
              <table>
                <caption className="sr-only">
                  Sections of {state.school.name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Status</th>
                    {canEdit && (
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {state.sections.map((section) => (
                    <tr key={section.id}>
                      <td>{section.title}</td>
                      <td>
                        {section.status === "inactive" ? "Inactive" : "Active"}
                      </td>
                      {canEdit && (
                        <td>
                          <button
                            className="btn btn-small"
                            aria-label={`Edit section ${section.title}`}
                            onClick={(event) => startEditing(section, event)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            aria-label={`Delete section ${section.title}`}
                            onClick={(event) => askToDelete(section, event)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {deleting && (
            <ConfirmPanel
              title={`Delete section ${deleting.title}?`}
              confirmLabel="Yes, delete section"
              onConfirm={confirmDelete}
              onCancel={cancelDelete}
              error={deleteError}
            >
              <p>This can't be undone.</p>
            </ConfirmPanel>
          )}

          {canEdit && (
            <>
              <h2>
                {editing ? `Edit section ${editing.title}` : "Add a section"}
              </h2>
              <SectionForm
                key={formKey}
                initialValues={
                  editing
                    ? { title: editing.title, status: editing.status }
                    : emptySection
                }
                onSubmit={handleSave}
                submitLabel={editing ? "Save changes" : "Add section"}
                onCancel={editing ? cancelEditing : undefined}
                autoFocus={focusForm}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
