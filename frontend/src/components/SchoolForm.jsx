import { useState } from "react";
import { useApiForm } from "../lib/useApiForm";
import TextField from "./TextField";

export default function SchoolForm({
  initialValues,
  onSubmit,
  submitLabel,
  showStatus = false,
}) {
  const [values, setValues] = useState(initialValues);
  const { errors, formError, submitting, submit } = useApiForm(onSubmit);

  const change = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();

    // Only super admins may send a status; the server refuses it from others.
    const payload = Object.fromEntries(
      Object.entries(values).filter(([key]) => showStatus || key !== "status"),
    );

    submit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card form-grid">
      {formError && (
        <p role="alert" className="error form-error">
          {formError}
        </p>
      )}

      <TextField
        label="Name"
        required
        value={values.name}
        onChange={change("name")}
        error={errors.name}
      />
      <TextField
        label="Email"
        type="email"
        value={values.email}
        onChange={change("email")}
        error={errors.email}
      />
      <TextField
        label="Phone"
        type="tel"
        value={values.phone}
        onChange={change("phone")}
        error={errors.phone}
      />
      <TextField
        label="Website"
        type="url"
        value={values.url}
        onChange={change("url")}
        error={errors.url}
      />

      {showStatus && (
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
      )}

      <TextField
        label="Address"
        as="textarea"
        rows={4}
        wide
        value={values.address}
        onChange={change("address")}
        error={errors.address}
      />
      <TextField
        label="About"
        as="textarea"
        rows={4}
        wide
        value={values.about}
        onChange={change("about")}
        error={errors.about}
      />

      <div className="actions">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
