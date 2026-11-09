import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SchoolCreate from "./pages/SchoolCreate";
import SchoolEdit from "./pages/SchoolEdit";
import SchoolList from "./pages/SchoolList";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/schools" element={<SchoolList />} />
        <Route path="/schools/new" element={<SchoolCreate />} />
        <Route path="/schools/:id/edit" element={<SchoolEdit />} />
      </Route>
    </Routes>
  );
}
