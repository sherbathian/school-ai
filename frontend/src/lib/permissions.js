// Mirrors the server's rules so the screens can hide what you can't use.
// The server still enforces everything; this only improves what people see.

export function canManageSchool(user, schoolId) {
  if (!user) return false;
  if (user.is_super_admin) return true;

  return (user.schools ?? []).some(
    (school) => school.id === schoolId && school.role === "admin",
  );
}

export function canCreateSchool(user) {
  return Boolean(user?.is_super_admin);
}
