import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import { listSchools } from "./schoolsApi";

vi.mock("../api", () => ({ default: { get: vi.fn() } }));

describe("listSchools", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("unwraps the data array and passes the request options on", async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 1, name: "North" }] } });
    const controller = new AbortController();

    const schools = await listSchools({ signal: controller.signal });

    expect(schools).toEqual([{ id: 1, name: "North" }]);
    expect(api.get).toHaveBeenCalledWith("/schools", {
      signal: controller.signal,
    });
  });
});
