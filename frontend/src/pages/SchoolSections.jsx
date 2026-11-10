import { useParams } from "react-router-dom";
import ConfirmPanel from "../components/ConfirmPanel";
import SectionForm from "../components/SectionForm";
import { useAuth } from "../context/useAuth";
import { sectionsApi } from "../lib/academicApi";
import { canManageSchool } from "../lib/permissions";
import { byTitle } from "../lib/sorting";
import { useCrudPage } from "../lib/useCrudPage";

const emptySection = { title: "", status: "active" };

// A constant, because the hook's loading effect depends on it.
const crud = {
  api: sectionsApi,
  sort: byTitle,
  loadError: "We couldn't load the sections.",
  messages: {
    added: (section) => `Section ${section.title} was added.`,
    saved: (section) => `Section ${section.title} was saved.`,
    deleted: (section) => `Section ${section.title} was deleted.`,
  },
};

export default function SchoolSections() {
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
          {state.items.length === 0 ? (
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
                  {state.items.map((section) => (
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
                onSubmit={save}
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
