// Turns a Laravel 422 response into { field: "first message" }.
export function validationErrors(error) {
  const errors = error?.response?.data?.errors;
  if (error?.response?.status !== 422 || !errors) return null;

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages[0]]),
  );
}

export function errorMessage(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  switch (error?.response?.status) {
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "That item no longer exists.";
    case 429:
      return "Too many attempts. Please wait a minute and try again.";
    default:
      return fallback;
  }
}
