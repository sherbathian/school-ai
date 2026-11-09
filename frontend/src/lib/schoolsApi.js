import api from "../api";

export async function listSchools(config = {}) {
  const response = await api.get("/schools", config);
  return response.data.data;
}

export async function getSchool(id, config = {}) {
  const response = await api.get(`/schools/${id}`, config);
  return response.data.data;
}

export async function createSchool(values) {
  const response = await api.post("/schools", values);
  return response.data.data;
}

export async function updateSchool(id, values) {
  const response = await api.patch(`/schools/${id}`, values);
  return response.data.data;
}

export async function deleteSchool(id) {
  await api.delete(`/schools/${id}`);
}
