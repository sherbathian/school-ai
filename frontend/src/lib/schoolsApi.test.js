import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import {
  createSchool,
  deleteSchool,
  getSchool,
  listSchools,
  updateSchool,
} from "./schoolsApi";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("schoolsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists schools, unwrapping the data array and passing options on", async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 1, name: "North" }] } });
    const controller = new AbortController();

    const schools = await listSchools({ signal: controller.signal });

    expect(schools).toEqual([{ id: 1, name: "North" }]);
    expect(api.get).toHaveBeenCalledWith("/schools", {
      signal: controller.signal,
    });
  });

  it("gets one school", async () => {
    api.get.mockResolvedValue({ data: { data: { id: 7, name: "East" } } });

    expect(await getSchool(7)).toEqual({ id: 7, name: "East" });
    expect(api.get).toHaveBeenCalledWith("/schools/7", {});
  });

  it("creates a school", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 3, name: "West" } } });

    expect(await createSchool({ name: "West" })).toEqual({
      id: 3,
      name: "West",
    });
    expect(api.post).toHaveBeenCalledWith("/schools", { name: "West" });
  });

  it("updates a school with a PATCH", async () => {
    api.patch.mockResolvedValue({ data: { data: { id: 3, name: "West 2" } } });

    expect(await updateSchool(3, { name: "West 2" })).toEqual({
      id: 3,
      name: "West 2",
    });
    expect(api.patch).toHaveBeenCalledWith("/schools/3", { name: "West 2" });
  });

  it("deletes a school", async () => {
    api.delete.mockResolvedValue({});

    await deleteSchool(3);

    expect(api.delete).toHaveBeenCalledWith("/schools/3");
  });
});
