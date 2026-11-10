// Alphabetical by title, but with numbers in numeric order: Grade 2 before Grade 10.
export const byTitle = (a, b) =>
  a.title.localeCompare(b.title, undefined, { numeric: true });

