import { useNavigate } from "react-router-dom";
import SchoolForm from "../components/SchoolForm";
import { useAuth } from "../context/useAuth";
import { canCreateSchool } from "../lib/permissions";
import { createSchool } from "../lib/schoolsApi";

const emptySchool = {
  name: "",
  url: "",
  phone: "",
  email: "",
  address: "",
  about: "",
  status: "active",
};

export default function SchoolCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!canCreateSchool(user)) {
    return (
      <div className="container">
        <p role="alert">Access denied.</p>
      </div>
    );
  }

  const handleSubmit = async (values) => {
    await createSchool(values);
    navigate("/schools", { state: { notice: "School created." } });
  };

  return (
    <div className="container">
      <h1>New school</h1>
      <SchoolForm
        initialValues={emptySchool}
        onSubmit={handleSubmit}
        submitLabel="Create school"
        showStatus
      />
    </div>
  );
}
