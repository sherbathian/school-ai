import api from "../api";

// CRUD calls for a resource that lives inside a school:
//   /schools/{schoolId}/{path}[/{id}]
export function createResourceApi(path) {
  const base = (schoolId) => `/schools/${schoolId}/${path}`;

  return {
    async list(schoolId, config = {}) {
      const response = await api.get(base(schoolId), config);
      return response.data.data;
    },

    async get(schoolId, id, config = {}) {
      const response = await api.get(`${base(schoolId)}/${id}`, config);
      return response.data.data;
    },

    async create(schoolId, values) {
      const response = await api.post(base(schoolId), values);
      return response.data.data;
    },

    async update(schoolId, id, values) {
      const response = await api.patch(`${base(schoolId)}/${id}`, values);
      return response.data.data;
    },

    async remove(schoolId, id) {
      await api.delete(`${base(schoolId)}/${id}`);
    },
  };
}
