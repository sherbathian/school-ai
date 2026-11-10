import { useState } from "react";
import { useApiForm } from "../lib/useApiForm";
import TextField from "./TextField";

const initialValues = { email: "", role: "teacher" };

export default function AttachMemberForm({ onSubmit }) {
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
      aria-label="Add an existing account"
    >
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      <TextField
        label="Email"
        type="email"
        autoComplete="off"
        hint="The person must already have an account at another school."
        value={values.email}
        onChange={change("email")}
        error={errors.email}
      />
      <TextField
        label="Role"
        as="select"
        value={values.role}
        onChange={change("role")}
        error={errors.role}
      >
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </TextField>

      <div className="actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Adding…" : "Add existing account"}
        </button>
      </div>
    </form>
  );
}
