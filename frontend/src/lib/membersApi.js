import api from "../api";

export async function listMembers(schoolId, config = {}) {
  const response = await api.get(`/schools/${schoolId}/users`, config);
  return response.data.data;
}

export async function addMember(schoolId, values) {
  const response = await api.post(`/schools/${schoolId}/users`, values);
  return response.data.data;
}

export async function changeMemberRole(schoolId, userId, role) {
  const response = await api.patch(`/schools/${schoolId}/users/${userId}`, {
    role,
  });
  return response.data.data;
}

export async function removeMember(schoolId, userId) {
  await api.delete(`/schools/${schoolId}/users/${userId}`);
}
