import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import { sectionsApi } from "./academicApi";

vi.mock("../api", () => ({ default: { get: vi.fn() } }));

describe("sectionsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("talks to the school's sections endpoint", async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 1, title: "A" }] } });

    expect(await sectionsApi.list(2)).toEqual([{ id: 1, title: "A" }]);
    expect(api.get).toHaveBeenCalledWith("/schools/2/sections", {});
  });
});
