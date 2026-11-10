import { useState } from "react";
import { useApiForm } from "../lib/useApiForm";
import TextField from "./TextField";

export default function SectionForm({
  initialValues,
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

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card form-grid"
      aria-label="Section"
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
