import { useId } from "react";
import { useAuth } from "../context/useAuth";

export default function SchoolSwitcher() {
  const { schools, currentSchool, selectSchool } = useAuth();
  const id = useId();

  // Nothing to switch between, so show nothing.
  if (schools.length < 2) return null;

  return (
    <div className="field school-switcher">
      <label htmlFor={id}>School</label>
      <select
        id={id}
        value={currentSchool?.id ?? ""}
        onChange={(e) => selectSchool(Number(e.target.value))}
      >
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
}
