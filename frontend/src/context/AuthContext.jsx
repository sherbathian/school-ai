import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Start in the loading state only if there is a saved token to check.
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );

  // When the app opens, check if a saved token is still valid
  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    api
      .get("/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await api.post("/logout").catch(() => {});
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// A shortcut so any page can write: const { user } = useAuth();
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
