import { useId } from "react";

// A label, a control, and its hint and error, wired together for assistive tech.
// `as` lets it render a select or textarea; other props go to the control.
export default function TextField({
  label,
  error,
  hint,
  as = "input",
  wide = false,
  required = false,
  ...props
}) {
  const Control = as;
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wide ? "field wide" : "field"}>
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
    </div>
  );
}
