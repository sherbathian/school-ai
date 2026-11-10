import { useState } from "react";
import { useApiForm } from "../lib/useApiForm";
import CheckboxGroup from "./CheckboxGroup";
import TextField from "./TextField";

export default function GradeForm({
  initialValues,
  sectionOptions,
  onSubmit,
  submitLabel,
  onCancel,
  autoFocus = false,
}) {
  const [values, setValues] = useState(initialValues);
  const { errors, formError, submitting, submit } = useApiForm(onSubmit);

  const change = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    submit(values);
  };

  // The server reports bad ids as "section_ids.0", "section_ids.1", ...
  const sectionsError = Object.entries(errors).find(([field]) =>
    field.startsWith("section_ids"),
  )?.[1];

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card form-grid"
      aria-label="Grade"
    >
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      <TextField
        label="Title"
        required
        autoFocus={autoFocus}
        value={values.title}
        onChange={change("title")}
        error={errors.title}
      />
      <TextField
        label="Status"
        as="select"
        value={values.status}
        onChange={change("status")}
        error={errors.status}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </TextField>

      <CheckboxGroup
        legend="Sections"
        options={sectionOptions}
        value={values.section_ids}
        onChange={(ids) =>
          setValues((current) => ({ ...current, section_ids: ids }))
        }
        error={sectionsError}
        emptyMessage="This school has no sections yet. Add some on the Sections page first."
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
