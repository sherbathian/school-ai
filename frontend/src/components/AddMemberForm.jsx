import { useState } from "react";
import { useApiForm } from "../lib/useApiForm";
import TextField from "./TextField";

const initialValues = { name: "", email: "", password: "", role: "teacher" };

export default function AddMemberForm({ onSubmit }) {
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
      aria-label="Add a person"
    >
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      <TextField
        label="Name"
        autoComplete="off"
        value={values.name}
        onChange={change("name")}
        error={errors.name}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="off"
        value={values.email}
        onChange={change("email")}
        error={errors.email}
      />
      <TextField
        label="Initial password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        value={values.password}
        onChange={change("password")}
        error={errors.password}
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
          {submitting ? "Adding…" : "Add person"}
        </button>
      </div>
    </form>
  );
}
