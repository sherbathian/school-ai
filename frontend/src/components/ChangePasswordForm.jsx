import { useState } from "react";
import { useApiForm } from "../lib/useApiForm";
import TextField from "./TextField";

const initialValues = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

export default function ChangePasswordForm({ onSubmit }) {
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
      aria-label="Change password"
    >
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      <TextField
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={values.current_password}
        onChange={change("current_password")}
        error={errors.current_password}
      />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters. Your other devices will be signed out."
        value={values.password}
        onChange={change("password")}
        error={errors.password}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={values.password_confirmation}
        onChange={change("password_confirmation")}
        error={errors.password_confirmation}
      />

      <div className="actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Changing…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
