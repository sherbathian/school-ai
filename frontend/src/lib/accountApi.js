import api from "../api";

export async function changePassword(values) {
  await api.post("/me/password", values);
}
