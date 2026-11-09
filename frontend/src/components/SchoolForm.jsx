import { useId, useState } from "react";
import { errorMessage, validationErrors } from "../lib/apiErrors";

export default function SchoolForm({
  initialValues,
  onSubmit,
  submitLabel,
  showStatus = false,
}) {
  const formId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setFormError("");
    setSubmitting(true);

    // Only super admins may send a status; the server refuses it from others.
    const payload = Object.fromEntries(
      Object.entries(values).filter(([key]) => showStatus || key !== "status"),
    );

    try {
      await onSubmit(payload);
    } catch (error) {
      const fieldErrors = validationErrors(error);
      if (fieldErrors) {
        setErrors(fieldErrors);
        setFormError("Please fix the highlighted fields.");
      } else {
        setFormError(errorMessage(error));
      }
      setSubmitting(false);
    }
  };

  const renderField = (
    name,
    label,
    { as = "input", type = "text", wide = false, required = false } = {},
  ) => {
    const id = `${formId}-${name}`;
    const errorId = `${id}-error`;
    const Control = as;
    const invalid = Boolean(errors[name]);

    return (
      <div className={wide ? "field wide" : "field"}>
        <label htmlFor={id}>{label}</label>
        <Control
          id={id}
          value={values[name]}
          onChange={change(name)}
          type={as === "input" ? type : undefined}
          rows={as === "textarea" ? 4 : undefined}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={invalid ? errorId : undefined}
        />
        {invalid && (
          <p id={errorId} className="error">
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  const statusId = `${formId}-status`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card form-grid">
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      {renderField("name", "Name", { required: true })}
      {renderField("email", "Email", { type: "email" })}
      {renderField("phone", "Phone", { type: "tel" })}
      {renderField("url", "Website", { type: "url" })}

      {showStatus && (
        <div className="field">
          <label htmlFor={statusId}>Status</label>
          <select
            id={statusId}
            value={values.status}
            onChange={change("status")}
            aria-invalid={errors.status ? "true" : undefined}
            aria-describedby={errors.status ? `${statusId}-error` : undefined}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {errors.status && (
            <p id={`${statusId}-error`} className="error">
              {errors.status}
            </p>
          )}
        </div>
      )}

      {renderField("address", "Address", { as: "textarea", wide: true })}
      {renderField("about", "About", { as: "textarea", wide: true })}

      <div className="actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
