import { useId } from "react";

// A labelled group of checkboxes that edits a list of ids.
// options: [{ id, label }]   value: the ids that are ticked
export default function CheckboxGroup({
  legend,
  options,
  value,
  onChange,
  error,
  emptyMessage = "There is nothing to choose from yet.",
}) {
  const id = useId();
  const errorId = `${id}-error`;

  const toggle = (optionId) =>
    onChange(
      value.includes(optionId)
        ? value.filter((selected) => selected !== optionId)
        : [...value, optionId],
    );

  return (
    <fieldset
      className="field wide checkbox-group"
      aria-describedby={error ? errorId : undefined}
    >
      <legend>{legend}</legend>

      {options.length === 0 ? (
        <p className="hint">{emptyMessage}</p>
      ) : (
        <ul className="checkbox-list">
          {options.map((option) => (
            <li key={option.id}>
              <label>
                <input
                  type="checkbox"
                  checked={value.includes(option.id)}
                  onChange={() => toggle(option.id)}
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
