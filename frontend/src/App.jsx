import { useEffect, useState } from "react";
import api from "./api";

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ name: "", roll_no: "", class_name: "" });

  const load = () => api.get("/students").then((r) => setStudents(r.data));
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/students", form);
    setForm({ name: "", roll_no: "", class_name: "" });
    load();
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <h1>Students</h1>
      <form onSubmit={submit}>
        {["name", "roll_no", "class_name"].map((f) => (
          <input
            key={f}
            placeholder={f}
            value={form[f]}
            onChange={(e) => setForm({ ...form, [f]: e.target.value })}
          />
        ))}
        <button>Add</button>
      </form>
      <ul>
        {students.map((s) => (
          <li key={s.id}>
            {s.roll_no} - {s.name} ({s.class_name})
          </li>
        ))}
      </ul>
    </div>
  );
}
