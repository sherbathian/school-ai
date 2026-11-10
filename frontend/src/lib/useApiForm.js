import { useState } from "react";
import { errorMessage, validationErrors } from "./apiErrors";

// Shared "save" behaviour for forms that talk to the API: field errors from a
// 422, a general message for anything else, and a saving flag.
// After a success the flag stays on, because the caller moves away or remounts
// the form with a new key.
export function useApiForm(onSubmit) {
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (values) => {
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

  return { errors, formError, submitting, submit };
}
