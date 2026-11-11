import { useState } from "react";
import { useApiForm } from "../lib/useApiForm";
import CheckboxGroup from "./CheckboxGroup";
import TextField from "./TextField";

// The server reports bad ids as "section_ids.0", "subject_ids.1", ...
const firstError = (errors, prefix) =>
  Object.entries(errors).find(([field]) => field.startsWith(prefix))?.[1];

export default function SubjectGroupForm({
  initialValues,
  grades, // each with its own `sections`
  subjects,
  gradeLocked = false,
  onSubmit,
  submitLabel,
  onCancel,
  autoFocus = false,
}) {
  const [values, setValues] = useState(initialValues);
  const { errors, formError, submitting, submit } = useApiForm(onSubmit);

  const change = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const chooseGrade = (event) => {
    const gradeId = event.target.value === "" ? "" : Number(event.target.value);
    const grade = grades.find((candidate) => candidate.id === gradeId);

    setValues((current) => ({
      ...current,
      grade_id: gradeId,
      // Keep only the ticked sections that the newly chosen grade also has.
      section_ids: current.section_ids.filter((id) =>
        grade?.sections.some((section) => section.id === id),
      ),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // The grade is fixed once a group exists; the server refuses it on updates.
    const payload = gradeLocked
      ? Object.fromEntries(
          Object.entries(values).filter(([key]) => key !== "grade_id"),
        )
      : values;

    submit(payload);
  };

  const selectedGrade = grades.find((grade) => grade.id === values.grade_id);

  const sectionOptions = (selectedGrade?.sections ?? []).map((section) => ({
    id: section.id,
    label:
      section.status === "inactive"
        ? `${section.title} (inactive)`
        : section.title,
  }));

  const subjectOptions = subjects.map((subject) => ({
    id: subject.id,
    label:
      subject.status === "inactive"
        ? `${subject.title} (${subject.code}, inactive)`
        : `${subject.title} (${subject.code})`,
  }));

  const gradeHint = gradeLocked
    ? "A group's grade can't be changed."
    : grades.length === 0
      ? "This school has no grades yet. Add some on the Grades page first."
      : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card form-grid"
      aria-label="Subject group"
    >
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      <TextField
        label="Grade"
        as="select"
        required
        disabled={gradeLocked}
        autoFocus={autoFocus && !gradeLocked}
        hint={gradeHint}
        value={values.grade_id}
        onChange={chooseGrade}
        error={errors.grade_id}
      >
        <option value="">Choose a grade</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.title}
          </option>
        ))}
      </TextField>

      <TextField
        label="Title"
        required
        autoFocus={autoFocus && gradeLocked}
        value={values.title}
        onChange={change("title")}
        error={errors.title}
      />

      <TextField
        label="Description"
        as="textarea"
        rows={3}
        wide
        value={values.description}
        onChange={change("description")}
        error={errors.description}
      />

      <CheckboxGroup
        legend="Sections"
        options={sectionOptions}
        value={values.section_ids}
        onChange={(ids) =>
          setValues((current) => ({ ...current, section_ids: ids }))
        }
        error={firstError(errors, "section_ids")}
        emptyMessage={
          selectedGrade
            ? "This grade has no sections yet. Add some on the Grades page first."
            : "Choose a grade to see its sections."
        }
      />

      <CheckboxGroup
        legend="Subjects"
        options={subjectOptions}
        value={values.subject_ids}
        onChange={(ids) =>
          setValues((current) => ({ ...current, subject_ids: ids }))
        }
        error={firstError(errors, "subject_ids")}
        emptyMessage="This school has no subjects yet. Add some on the Subjects page first."
      />

      <div className="actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
