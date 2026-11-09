import { useId, useState } from "react";
import { errorMessage, validationErrors } from "../lib/apiErrors";

const initialValues = { name: "", email: "", password: "", role: "teacher" };

export default function AddMemberForm({ onSubmit }) {
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

    try {
      await onSubmit(values);
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
    { type = "text", autoComplete, hint } = {},
  ) => {
    const id = `${formId}-${name}`;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const invalid = Boolean(errors[name]);
    const describedBy = [hint && hintId, invalid && errorId]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={change(name)}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy || undefined}
        />
        {hint && (
          <p id={hintId} className="hint">
            {hint}
          </p>
        )}
        {invalid && (
          <p id={errorId} className="error">
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  const roleId = `${formId}-role`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card form-grid">
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      {renderField("name", "Name", { autoComplete: "off" })}
      {renderField("email", "Email", { type: "email", autoComplete: "off" })}
      {renderField("password", "Initial password", {
        type: "password",
        autoComplete: "new-password",
        hint: "At least 10 characters.",
      })}

      <div className="field">
        <label htmlFor={roleId}>Role</label>
        <select
          id={roleId}
          value={values.role}
          onChange={change("role")}
          aria-invalid={errors.role ? "true" : undefined}
          aria-describedby={errors.role ? `${roleId}-error` : undefined}
        >
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role && (
          <p id={`${roleId}-error`} className="error">
            {errors.role}
          </p>
        )}
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Adding…" : "Add person"}
        </button>
      </div>
    </form>
  );
}
