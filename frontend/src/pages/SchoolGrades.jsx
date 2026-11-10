import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ConfirmPanel from "../components/ConfirmPanel";
import GradeForm from "../components/GradeForm";
import { useAuth } from "../context/useAuth";
import { gradesApi, sectionsApi } from "../lib/academicApi";
import { errorMessage, firstErrorMessage } from "../lib/apiErrors";
import { canManageSchool } from "../lib/permissions";
import { getSchool } from "../lib/schoolsApi";

const byTitle = (a, b) =>
  a.title.localeCompare(b.title, undefined, { numeric: true });

const emptyGrade = { title: "", status: "active", section_ids: [] };

export default function SchoolGrades() {
  const { id } = useParams();
  const { user } = useAuth();
  const schoolId = Number(id);
  const canEdit = canManageSchool(user, schoolId);

  const [state, setState] = useState({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // a grade, or null for "add"
  const [formKey, setFormKey] = useState(0);
  const [focusForm, setFocusForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const headingRef = useRef(null);
  const editTrigger = useRef(null);
  const deleteTrigger = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };

    Promise.all([
      getSchool(schoolId, options),
      gradesApi.list(schoolId, options),
      sectionsApi.list(schoolId, options),
    ])
      .then(([school, grades, sections]) =>
        setState({
          status: "ok",
          school,
          grades: [...grades].sort(byTitle),
          sections: [...sections].sort(byTitle),
        }),
      )
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setState({
          status: "error",
          message: errorMessage(error, "We couldn't load the grades."),
        });
      });

    return () => controller.abort();
  }, [schoolId]);

  // A new key makes React build the form again with fresh starting values.
  const resetForm = () => setFormKey((key) => key + 1);

  const startEditing = (grade, event) => {
    editTrigger.current = event.currentTarget;
    setNotice("");
    setEditing(grade);
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
      const updated = await gradesApi.update(schoolId, editing.id, values);
      setState((current) => ({
        ...current,
        grades: current.grades
          .map((grade) => (grade.id === updated.id ? updated : grade))
          .sort(byTitle),
      }));
      setNotice(`${updated.title} was saved.`);
      setEditing(null);
      setFocusForm(false);
      resetForm();
      headingRef.current?.focus();
    } else {
      const created = await gradesApi.create(schoolId, values);
      setState((current) => ({
        ...current,
        grades: [...current.grades, created].sort(byTitle),
      }));
      setNotice(`${created.title} was added.`);
      setFocusForm(true); // ready for the next one
      resetForm();
    }
  };

  const askToDelete = (grade, event) => {
    deleteTrigger.current = event.currentTarget;
    setNotice("");
    setDeleteError("");
    setDeleting(grade);
  };

  const cancelDelete = () => {
    setDeleting(null);
    setDeleteError("");
    deleteTrigger.current?.focus();
  };

  const confirmDelete = async () => {
    const grade = deleting;
    setDeleteError("");

    try {
      await gradesApi.remove(schoolId, grade.id);
      setState((current) => ({
        ...current,
        grades: current.grades.filter((g) => g.id !== grade.id),
      }));
      if (editing?.id === grade.id) {
        setEditing(null);
        setFocusForm(false);
        resetForm();
      }
      setDeleting(null);
      setNotice(`${grade.title} was deleted.`);
      // The row that had focus is gone, so keep the user's place on the heading.
      headingRef.current?.focus();
    } catch (error) {
      setDeleteError(firstErrorMessage(error));
    }
  };

  const sectionOptions =
    state.status === "ok"
      ? state.sections.map((section) => ({
          id: section.id,
          label:
            section.status === "inactive"
              ? `${section.title} (inactive)`
              : section.title,
        }))
      : [];

  return (
    <div className="container">
      <h1 ref={headingRef} tabIndex={-1}>
        {state.status === "ok" ? `Grades of ${state.school.name}` : "Grades"}
      </h1>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {state.status === "loading" && <p role="status">Loading grades…</p>}

      {state.status === "error" && <p role="alert">{state.message}</p>}

      {state.status === "ok" && (
        <>
          {state.grades.length === 0 ? (
            <p className="card empty">
              No grades yet.{canEdit ? " Add the first one below." : ""}
            </p>
          ) : (
            <div className="card">
              <table>
                <caption className="sr-only">
                  Grades of {state.school.name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Sections</th>
                    <th scope="col">Status</th>
                    {canEdit && (
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {state.grades.map((grade) => (
                    <tr key={grade.id}>
                      <td>{grade.title}</td>
                      <td>
                        {grade.sections
                          .map((section) => section.title)
                          .join(", ") || "—"}
                      </td>
                      <td>
                        {grade.status === "inactive" ? "Inactive" : "Active"}
                      </td>
                      {canEdit && (
                        <td>
                          <button
                            className="btn btn-small"
                            aria-label={`Edit ${grade.title}`}
                            onClick={(event) => startEditing(grade, event)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            aria-label={`Delete ${grade.title}`}
                            onClick={(event) => askToDelete(grade, event)}
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
              title={`Delete ${deleting.title}?`}
              confirmLabel="Yes, delete grade"
              onConfirm={confirmDelete}
              onCancel={cancelDelete}
              error={deleteError}
            >
              <p>This can't be undone. Its sections are kept.</p>
            </ConfirmPanel>
          )}

          {canEdit && (
            <>
              <h2>{editing ? `Edit ${editing.title}` : "Add a grade"}</h2>
              <GradeForm
                key={formKey}
                initialValues={
                  editing
                    ? {
                        title: editing.title,
                        status: editing.status,
                        section_ids: editing.sections.map(
                          (section) => section.id,
                        ),
                      }
                    : emptyGrade
                }
                sectionOptions={sectionOptions}
                onSubmit={handleSave}
                submitLabel={editing ? "Save changes" : "Add grade"}
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
