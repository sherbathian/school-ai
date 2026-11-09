import { useCallback, useEffect, useState } from "react";
import api, { setUnauthorizedHandler } from "../api";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "token";
const SCHOOL_KEY = "schoolId";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Start in the loading state only if there is a saved token to check.
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );
  // The school the person last picked (just an id; everything else is derived).
  const [schoolId, setSchoolId] = useState(
    () => Number(localStorage.getItem(SCHOOL_KEY)) || null,
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SCHOOL_KEY);
    setUser(null);
    setSchoolId(null);
  }, []);

  // When the app opens, check if a saved token is still valid.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;

    api
      .get("/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  // If any later request comes back 401, end the session.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = async (email, password) => {
    const res = await api.post("/login", { email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await api.post("/logout").catch(() => {});
    clearSession();
  };

  const selectSchool = (id) => {
    localStorage.setItem(SCHOOL_KEY, String(id));
    setSchoolId(id);
  };

  // Derived values: computed from state, never stored separately.
  const schools = user?.schools ?? [];
  const currentSchool =
    schools.find((school) => school.id === schoolId) ?? schools[0] ?? null;

  // Super admins count as every role; everyone else is judged by their
  // role at the school they are currently looking at.
  const hasRole = (roles) =>
    Boolean(user?.is_super_admin) || roles.includes(currentSchool?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        schools,
        currentSchool,
        selectSchool,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
