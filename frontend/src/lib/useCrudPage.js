import { useEffect, useRef, useState } from "react";
import { errorMessage, firstErrorMessage } from "./apiErrors";
import { getSchool } from "./schoolsApi";

/**
 * The shared behaviour of a school's "list, one add/edit form, delete with
 * confirmation" pages.
 *
 * `config` must be a constant defined outside the component, because the
 * loading effect depends on it:
 *   api        a createResourceApi(...) object
 *   sort       how to order the items
 *   loadExtra  optional (schoolId, options) => Promise<object>; its result is
 *              merged into `state` (e.g. the sections a grade can use)
 *   loadError  message when loading fails for an unknown reason
 *   messages   { added(item), saved(item), deleted(item) } => notice text
 */
export function useCrudPage(schoolId, config) {
  const [state, setState] = useState({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // an item, or null for "add"
  const [formKey, setFormKey] = useState(0);
  const [focusForm, setFocusForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const headingRef = useRef(null);
  const editTrigger = useRef(null);
  const deleteTrigger = useRef(null);

  useEffect(() => {
    const { api, sort, loadExtra, loadError } = config;
    const controller = new AbortController();
    const options = { signal: controller.signal };

    Promise.all([
      getSchool(schoolId, options),
      api.list(schoolId, options),
      loadExtra ? loadExtra(schoolId, options) : {},
    ])
      .then(([school, items, extra]) =>
        setState({
          status: "ok",
          school,
          items: [...items].sort(sort),
          ...extra,
        }),
      )
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setState({ status: "error", message: errorMessage(error, loadError) });
      });

    return () => controller.abort();
  }, [schoolId, config]);

  // A new key makes React build the form again with fresh starting values.
  const resetForm = () => setFormKey((key) => key + 1);

  const startEditing = (item, event) => {
    editTrigger.current = event.currentTarget;
    setNotice("");
    setEditing(item);
    setFocusForm(true);
    resetForm();
  };

  const cancelEditing = () => {
    setEditing(null);
    setFocusForm(false);
    resetForm();
    editTrigger.current?.focus();
  };

  const save = async (values) => {
    setNotice("");

    if (editing) {
      const updated = await config.api.update(schoolId, editing.id, values);
      setState((current) => ({
        ...current,
        items: current.items
          .map((item) => (item.id === updated.id ? updated : item))
          .sort(config.sort),
      }));
      setNotice(config.messages.saved(updated));
      setEditing(null);
      setFocusForm(false);
      resetForm();
      headingRef.current?.focus();
    } else {
      const created = await config.api.create(schoolId, values);
      setState((current) => ({
        ...current,
        items: [...current.items, created].sort(config.sort),
      }));
      setNotice(config.messages.added(created));
      setFocusForm(true); // ready for the next one
      resetForm();
    }
  };

  const askToDelete = (item, event) => {
    deleteTrigger.current = event.currentTarget;
    setNotice("");
    setDeleteError("");
    setDeleting(item);
  };

  const cancelDelete = () => {
    setDeleting(null);
    setDeleteError("");
    deleteTrigger.current?.focus();
  };

  const confirmDelete = async () => {
    const item = deleting;
    setDeleteError("");

    try {
      await config.api.remove(schoolId, item.id);
      setState((current) => ({
        ...current,
        items: current.items.filter((i) => i.id !== item.id),
      }));
      if (editing?.id === item.id) {
        setEditing(null);
        setFocusForm(false);
        resetForm();
      }
      setDeleting(null);
      setNotice(config.messages.deleted(item));
      // The row that had focus is gone, so keep the user's place on the heading.
      headingRef.current?.focus();
    } catch (error) {
      setDeleteError(firstErrorMessage(error));
    }
  };

  return {
    state,
    notice,
    editing,
    formKey,
    focusForm,
    deleting,
    deleteError,
    headingRef,
    startEditing,
    cancelEditing,
    save,
    askToDelete,
    cancelDelete,
    confirmDelete,
  };
}
