import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import {
  addMember,
  changeMemberRole,
  listMembers,
  removeMember,
} from "./membersApi";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const sara = {
  id: 20,
  name: "Sara",
  email: "sara@school.test",
  role: "teacher",
};

describe("membersApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists a school's members and passes options on", async () => {
    api.get.mockResolvedValue({ data: { data: [sara] } });
    const controller = new AbortController();

    const members = await listMembers(1, { signal: controller.signal });

    expect(members).toEqual([sara]);
    expect(api.get).toHaveBeenCalledWith("/schools/1/users", {
      signal: controller.signal,
    });
  });

  it("adds a member", async () => {
    api.post.mockResolvedValue({ data: { data: sara } });
    const values = {
      name: "Sara",
      email: "sara@school.test",
      password: "a-long-password",
      role: "teacher",
    };

    expect(await addMember(1, values)).toEqual(sara);
    expect(api.post).toHaveBeenCalledWith("/schools/1/users", values);
  });

  it("changes a member's role with a PATCH", async () => {
    api.patch.mockResolvedValue({ data: { data: { ...sara, role: "admin" } } });

    expect(await changeMemberRole(1, 20, "admin")).toEqual({
      ...sara,
      role: "admin",
    });
    expect(api.patch).toHaveBeenCalledWith("/schools/1/users/20", {
      role: "admin",
    });
  });

  it("removes a member", async () => {
    api.delete.mockResolvedValue({});

    await removeMember(1, 20);

    expect(api.delete).toHaveBeenCalledWith("/schools/1/users/20");
  });
});
