import { useParams } from "react-router-dom";
import ConfirmPanel from "../components/ConfirmPanel";
import SubjectForm from "../components/SubjectForm";
import { useAuth } from "../context/useAuth";
import { subjectsApi } from "../lib/academicApi";
import { canManageSchool } from "../lib/permissions";
import { byTitle } from "../lib/sorting";
import { useCrudPage } from "../lib/useCrudPage";

const emptySubject = { title: "", code: "", type: "theory", status: "active" };

const typeLabels = { theory: "Theory", practical: "Practical" };

// Titles can repeat (a theory and a practical "Mathematics"), so codes break ties.
const bySubject = (a, b) => byTitle(a, b) || a.code.localeCompare(b.code);

const label = (subject) => `${subject.title} (${subject.code})`;

// A constant, because the hook's loading effect depends on it.
const crud = {
  api: subjectsApi,
  sort: bySubject,
  loadError: "We couldn't load the subjects.",
  messages: {
    added: (subject) => `${label(subject)} was added.`,
    saved: (subject) => `${label(subject)} was saved.`,
    deleted: (subject) => `${label(subject)} was deleted.`,
  },
};

export default function SchoolSubjects() {
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

  return (
    <div className="container">
      <h1 ref={headingRef} tabIndex={-1}>
        {state.status === "ok"
          ? `Subjects of ${state.school.name}`
          : "Subjects"}
      </h1>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {state.status === "loading" && <p role="status">Loading subjects…</p>}

      {state.status === "error" && <p role="alert">{state.message}</p>}

      {state.status === "ok" && (
        <>
          {state.items.length === 0 ? (
            <p className="card empty">
              No subjects yet.{canEdit ? " Add the first one below." : ""}
            </p>
          ) : (
            <div className="card">
              <table>
                <caption className="sr-only">
                  Subjects of {state.school.name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Code</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    {canEdit && (
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((subject) => (
                    <tr key={subject.id}>
                      <td>{subject.title}</td>
                      <td>{subject.code}</td>
                      <td>{typeLabels[subject.type]}</td>
                      <td>
                        {subject.status === "inactive" ? "Inactive" : "Active"}
                      </td>
                      {canEdit && (
                        <td>
                          <button
                            className="btn btn-small"
                            aria-label={`Edit ${subject.code}`}
                            onClick={(event) => startEditing(subject, event)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            aria-label={`Delete ${subject.code}`}
                            onClick={(event) => askToDelete(subject, event)}
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
              title={`Delete ${label(deleting)}?`}
              confirmLabel="Yes, delete subject"
              onConfirm={confirmDelete}
              onCancel={cancelDelete}
              error={deleteError}
            >
              <p>This can't be undone.</p>
            </ConfirmPanel>
          )}

          {canEdit && (
            <>
              <h2>{editing ? `Edit ${label(editing)}` : "Add a subject"}</h2>
              <SubjectForm
                key={formKey}
                initialValues={
                  editing
                    ? {
                        title: editing.title,
                        code: editing.code,
                        type: editing.type,
                        status: editing.status,
                      }
                    : emptySubject
                }
                onSubmit={save}
                submitLabel={editing ? "Save changes" : "Add subject"}
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
