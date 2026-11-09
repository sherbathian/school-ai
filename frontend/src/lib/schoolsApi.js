import api from "../api";

export async function listSchools(config = {}) {
  const response = await api.get("/schools", config);
  return response.data.data;
}
