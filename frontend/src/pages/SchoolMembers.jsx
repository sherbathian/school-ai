import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AddMemberForm from "../components/AddMemberForm";
import { useAuth } from "../context/useAuth";
import { errorMessage, firstErrorMessage } from "../lib/apiErrors";
import {
  addMember,
  changeMemberRole,
  listMembers,
  removeMember,
} from "../lib/membersApi";
import { canManageSchool } from "../lib/permissions";
import { getSchool } from "../lib/schoolsApi";

const byName = (a, b) => a.name.localeCompare(b.name);

export default function SchoolMembers() {
  const { id } = useParams();
  const { user } = useAuth();
  const schoolId = Number(id);

  // Check permission before loading anything.
  if (!canManageSchool(user, schoolId)) {
    return (
      <div className="container">
        <p role="alert">Access denied.</p>
      </div>
    );
  }

  return <MembersLoader schoolId={schoolId} />;
}

function MembersLoader({ schoolId }) {
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [rowErrors, setRowErrors] = useState({});
  const [busyIds, setBusyIds] = useState([]);
  const [removing, setRemoving] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const headingRef = useRef(null);
  const removeTrigger = useRef(null);
  const cancelButton = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getSchool(schoolId, { signal: controller.signal }),
      listMembers(schoolId, { signal: controller.signal }),
    ])
      .then(([school, members]) => setState({ status: "ok", school, members }))
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setState({
          status: "error",
          message: errorMessage(error, "We couldn't load the members."),
        });
      });

    return () => controller.abort();
  }, [schoolId]);

  // When the confirmation opens, put focus on the safe choice.
  useEffect(() => {
    if (removing) cancelButton.current?.focus();
  }, [removing]);

  const setBusy = (userId, isBusy) =>
    setBusyIds((ids) =>
      isBusy ? [...ids, userId] : ids.filter((id) => id !== userId),
    );

  // If people change or lose their own role, our copy of their schools is stale.
  const refreshIfSelf = async (memberId) => {
    if (memberId === user.id) await refreshUser().catch(() => {});
  };

  const handleRoleChange = async (member, role) => {
    setNotice("");
    setRowErrors((errors) => ({ ...errors, [member.id]: "" }));
    setBusy(member.id, true);

    try {
      const updated = await changeMemberRole(schoolId, member.id, role);
      setState((current) => ({
        ...current,
        members: current.members.map((m) =>
          m.id === updated.id ? updated : m,
        ),
      }));
      setNotice(
        `${member.name} is now ${role === "admin" ? "an admin" : "a teacher"}.`,
      );
      await refreshIfSelf(member.id);
    } catch (error) {
      setRowErrors((errors) => ({
        ...errors,
        [member.id]: firstErrorMessage(error),
      }));
    } finally {
      setBusy(member.id, false);
    }
  };

  const handleAdd = async (values) => {
    setNotice("");
    const member = await addMember(schoolId, values);

    setState((current) => ({
      ...current,
      members: [...current.members, member].sort(byName),
    }));
    setNotice(`${member.name} was added.`);
    setFormKey((key) => key + 1); // a new key gives us a fresh, empty form
  };

  const askToRemove = (member, event) => {
    removeTrigger.current = event.currentTarget;
    setNotice("");
    setRemoveError("");
    setRemoving(member);
  };

  const cancelRemove = () => {
    setRemoving(null);
    setRemoveError("");
    removeTrigger.current?.focus();
  };

  const confirmRemove = async () => {
    const member = removing;
    setRemoveError("");

    try {
      await removeMember(schoolId, member.id);
      setState((current) => ({
        ...current,
        members: current.members.filter((m) => m.id !== member.id),
      }));
      setRemoving(null);
      setNotice(`${member.name} was removed.`);
      // The row that had focus is gone, so keep the user's place on the heading.
      headingRef.current?.focus();
      await refreshIfSelf(member.id);
    } catch (error) {
      setRemoveError(firstErrorMessage(error));
    }
  };

  return (
    <div className="container">
      <h1 ref={headingRef} tabIndex={-1}>
        {state.status === "ok" ? `Members of ${state.school.name}` : "Members"}
      </h1>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {state.status === "loading" && <p role="status">Loading members…</p>}

      {state.status === "error" && <p role="alert">{state.message}</p>}

      {state.status === "ok" && (
        <>
          {state.members.length === 0 ? (
            <p className="card empty">
              No members yet. Add the first admin below.
            </p>
          ) : (
            <div className="card">
              <table>
                <caption className="sr-only">
                  Members of {state.school.name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.members.map((member) => {
                    const rowError = rowErrors[member.id];
                    const errorId = `member-${member.id}-error`;

                    return (
                      <tr key={member.id}>
                        <td>
                          {member.name}
                          {member.id === user.id ? " (you)" : ""}
                        </td>
                        <td>{member.email}</td>
                        <td>
                          <select
                            aria-label={`Role for ${member.name}`}
                            value={member.role}
                            disabled={busyIds.includes(member.id)}
                            onChange={(e) =>
                              handleRoleChange(member, e.target.value)
                            }
                            aria-invalid={rowError ? "true" : undefined}
                            aria-describedby={rowError ? errorId : undefined}
                          >
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                          </select>
                          {rowError && (
                            <p id={errorId} className="error">
                              {rowError}
                            </p>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-small"
                            aria-label={`Remove ${member.name}`}
                            onClick={(event) => askToRemove(member, event)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {removing && (
            <section aria-labelledby="confirm-remove-title" className="danger">
              <h2 id="confirm-remove-title">Remove {removing.name}?</h2>
              <p>
                They will lose access to {state.school.name}. Their account is
                kept.
              </p>
              {removeError && (
                <p role="alert" className="error">
                  {removeError}
                </p>
              )}
              <button className="btn btn-danger" onClick={confirmRemove}>
                Yes, remove
              </button>
              <button
                ref={cancelButton}
                className="btn btn-secondary"
                onClick={cancelRemove}
              >
                Cancel
              </button>
            </section>
          )}

          <h2>Add a person</h2>
          <AddMemberForm key={formKey} onSubmit={handleAdd} />
        </>
      )}
    </div>
  );
}
