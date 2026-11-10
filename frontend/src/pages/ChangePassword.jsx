import { useState } from "react";
import ChangePasswordForm from "../components/ChangePasswordForm";
import { changePassword } from "../lib/accountApi";

export default function ChangePassword() {
  const [notice, setNotice] = useState("");
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (values) => {
    setNotice("");
    await changePassword(values);
    setNotice("Your password was changed. Other devices were signed out.");
    setFormKey((key) => key + 1); // a new key gives us a fresh, empty form
  };

  return (
    <div className="container">
      <h1>Change password</h1>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      <ChangePasswordForm key={formKey} onSubmit={handleSubmit} />
    </div>
  );
}
