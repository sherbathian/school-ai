import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const emptyForm = { name: "", roll_no: "", class_name: "", guardian_phone: "" };

const fields = [
  { name: "name", label: "Student Name" },
  { name: "roll_no", label: "Roll No" },
  { name: "class_name", label: "Class" },
  { name: "guardian_phone", label: "Guardian Phone" },
];

export default function Students() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = adding, number = editing
  const [errors, setErrors] = useState({});

  const load = () => api.get("/students").then((r) => setStudents(r.data));
  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, form);
      } else {
        await api.post("/students", form);
      }
      resetForm();
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
    }
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setForm({
      name: student.name,
      roll_no: student.roll_no,
      class_name: student.class_name,
      guardian_phone: student.guardian_phone || "",
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (student) => {
    if (!window.confirm(`Delete ${student.name}?`)) return;
    await api.delete(`/students/${student.id}`);
    load();
  };

  return (
    <div className="container">
      <div className="topbar">
        <h1>Students</h1>
        <Link to="/" className="link">
          Back to Dashboard
        </Link>
      </div>

      <form onSubmit={submit} className="card form-grid">
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label>{f.label}</label>
            <input name={f.name} value={form[f.name]} onChange={handleChange} />
            {errors[f.name] && <p className="error">{errors[f.name][0]}</p>}
          </div>
        ))}
        <div className="actions">
          <button className="btn btn-primary">
            {editingId ? "Update Student" : "Add Student"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Class</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.roll_no}</td>
              <td>{s.name}</td>
              <td>{s.class_name}</td>
              <td>{s.guardian_phone}</td>
              <td>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => startEdit(s)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => remove(s)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan="5" className="empty">
                No students yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
