import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SchoolCreate from "./pages/SchoolCreate";
import SchoolEdit from "./pages/SchoolEdit";
import SchoolHome from "./pages/SchoolHome";
import SchoolList from "./pages/SchoolList";
import SchoolMembers from "./pages/SchoolMembers";
import SchoolSections from "./pages/SchoolSections";

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
        <Route path="/schools/:id" element={<SchoolHome />} />
        <Route path="/schools/:id/edit" element={<SchoolEdit />} />
        <Route path="/schools/:id/members" element={<SchoolMembers />} />
        <Route path="/schools/:id/sections" element={<SchoolSections />} />
        <Route path="/account/password" element={<ChangePassword />} />
      </Route>
    </Routes>
  );
}
