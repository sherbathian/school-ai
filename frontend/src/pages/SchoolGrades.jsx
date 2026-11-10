import { useParams } from "react-router-dom";
import ConfirmPanel from "../components/ConfirmPanel";
import GradeForm from "../components/GradeForm";
import { useAuth } from "../context/useAuth";
import { gradesApi, sectionsApi } from "../lib/academicApi";
import { canManageSchool } from "../lib/permissions";
import { byTitle } from "../lib/sorting";
import { useCrudPage } from "../lib/useCrudPage";

const emptyGrade = { title: "", status: "active", section_ids: [] };

// The form offers the school's sections, so they are loaded alongside the grades.
const loadSections = async (schoolId, options) => ({
  sections: [...(await sectionsApi.list(schoolId, options))].sort(byTitle),
});

// A constant, because the hook's loading effect depends on it.
const crud = {
  api: gradesApi,
  sort: byTitle,
  loadExtra: loadSections,
  loadError: "We couldn't load the grades.",
  messages: {
    added: (grade) => `${grade.title} was added.`,
    saved: (grade) => `${grade.title} was saved.`,
    deleted: (grade) => `${grade.title} was deleted.`,
  },
};

export default function SchoolGrades() {
  const { id } = useParams();
  const { user } = useAuth();
  const schoolId = Number(id);
  const canEdit = canManageSchool(user, schoolId);

  const {
    state,
    notice,
    editing,
    formKey,
    focusForm,
    deleting,
    deleteError,
    headingRef,
    startEditing,
    cancelEditing,
    save,
    askToDelete,
    cancelDelete,
    confirmDelete,
  } = useCrudPage(schoolId, crud);

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
          {state.items.length === 0 ? (
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
                  {state.items.map((grade) => (
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
                onSubmit={save}
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
