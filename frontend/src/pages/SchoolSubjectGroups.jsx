import { useParams } from "react-router-dom";
import ConfirmPanel from "../components/ConfirmPanel";
import SubjectGroupForm from "../components/SubjectGroupForm";
import { useAuth } from "../context/useAuth";
import { gradesApi, subjectGroupsApi, subjectsApi } from "../lib/academicApi";
import { canManageSchool } from "../lib/permissions";
import { byTitle } from "../lib/sorting";
import { useCrudPage } from "../lib/useCrudPage";

const emptyGroup = {
  grade_id: "",
  title: "",
  description: "",
  section_ids: [],
  subject_ids: [],
};

// Grouped by grade, then by title.
const byGradeThenTitle = (a, b) => byTitle(a.grade, b.grade) || byTitle(a, b);

const bySubject = (a, b) => byTitle(a, b) || a.code.localeCompare(b.code);

// "Core (Grade 1)": two grades can each have a group with the same title.
const label = (group) => `${group.title} (${group.grade.title})`;

// The form offers the school's grades (with their sections) and subjects.
const loadChoices = async (schoolId, options) => {
  const [grades, subjects] = await Promise.all([
    gradesApi.list(schoolId, options),
    subjectsApi.list(schoolId, options),
  ]);

  return {
    grades: [...grades].sort(byTitle),
    subjects: [...subjects].sort(bySubject),
  };
};

// A constant, because the hook's loading effect depends on it.
const crud = {
  api: subjectGroupsApi,
  sort: byGradeThenTitle,
  loadExtra: loadChoices,
  loadError: "We couldn't load the subject groups.",
  messages: {
    added: (group) => `${label(group)} was added.`,
    saved: (group) => `${label(group)} was saved.`,
    deleted: (group) => `${label(group)} was deleted.`,
  },
};

export default function SchoolSubjectGroups() {
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
          ? `Subject groups of ${state.school.name}`
          : "Subject groups"}
      </h1>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {state.status === "loading" && (
        <p role="status">Loading subject groups…</p>
      )}

      {state.status === "error" && <p role="alert">{state.message}</p>}

      {state.status === "ok" && (
        <>
          {state.items.length === 0 ? (
            <p className="card empty">
              No subject groups yet.{canEdit ? " Add the first one below." : ""}
            </p>
          ) : (
            <div className="card">
              <table>
                <caption className="sr-only">
                  Subject groups of {state.school.name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Grade</th>
                    <th scope="col">Sections</th>
                    <th scope="col">Subjects</th>
                    {canEdit && (
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((group) => (
                    <tr key={group.id}>
                      <td>{group.title}</td>
                      <td>{group.grade.title}</td>
                      <td>
                        {group.sections
                          .map((section) => section.title)
                          .join(", ") || "—"}
                      </td>
                      <td>
                        {group.subjects
                          .map((subject) => subject.code)
                          .join(", ") || "—"}
                      </td>
                      {canEdit && (
                        <td>
                          <button
                            className="btn btn-small"
                            aria-label={`Edit ${label(group)}`}
                            onClick={(event) => startEditing(group, event)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            aria-label={`Delete ${label(group)}`}
                            onClick={(event) => askToDelete(group, event)}
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
              confirmLabel="Yes, delete subject group"
              onConfirm={confirmDelete}
              onCancel={cancelDelete}
              error={deleteError}
            >
              <p>
                This can't be undone. Its grade, sections and subjects are kept.
              </p>
            </ConfirmPanel>
          )}

          {canEdit && (
            <>
              <h2>
                {editing ? `Edit ${label(editing)}` : "Add a subject group"}
              </h2>
              <SubjectGroupForm
                key={formKey}
                initialValues={
                  editing
                    ? {
                        grade_id: editing.grade_id,
                        title: editing.title,
                        description: editing.description ?? "",
                        section_ids: editing.sections.map(
                          (section) => section.id,
                        ),
                        subject_ids: editing.subjects.map(
                          (subject) => subject.id,
                        ),
                      }
                    : emptyGroup
                }
                grades={state.grades}
                subjects={state.subjects}
                gradeLocked={Boolean(editing)}
                onSubmit={save}
                submitLabel={editing ? "Save changes" : "Add subject group"}
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
