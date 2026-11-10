import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import { gradesApi, sectionsApi, subjectsApi } from "./academicApi";

vi.mock("../api", () => ({ default: { get: vi.fn() } }));

describe("academic APIs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sectionsApi talks to the school's sections endpoint", async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 1, title: "A" }] } });

    expect(await sectionsApi.list(2)).toEqual([{ id: 1, title: "A" }]);
    expect(api.get).toHaveBeenCalledWith("/schools/2/sections", {});
  });

  it("gradesApi talks to the school's grades endpoint", async () => {
    api.get.mockResolvedValue({
      data: { data: [{ id: 1, title: "Grade 1" }] },
    });

    expect(await gradesApi.list(2)).toEqual([{ id: 1, title: "Grade 1" }]);
    expect(api.get).toHaveBeenCalledWith("/schools/2/grades", {});
  });

  it("subjectsApi talks to the school's subjects endpoint", async () => {
    api.get.mockResolvedValue({
      data: { data: [{ id: 1, title: "Mathematics" }] },
    });

    expect(await subjectsApi.list(2)).toEqual([
      { id: 1, title: "Mathematics" },
    ]);
    expect(api.get).toHaveBeenCalledWith("/schools/2/subjects", {});
  });
});
