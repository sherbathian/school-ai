import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import { createResourceApi } from "./resourceApi";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const widgets = createResourceApi("widgets");

describe("createResourceApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists, unwrapping the data array and passing options on", async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 1 }] } });
    const controller = new AbortController();

    expect(await widgets.list(4, { signal: controller.signal })).toEqual([
      { id: 1 },
    ]);
    expect(api.get).toHaveBeenCalledWith("/schools/4/widgets", {
      signal: controller.signal,
    });
  });

  it("gets one item", async () => {
    api.get.mockResolvedValue({ data: { data: { id: 7 } } });

    expect(await widgets.get(4, 7)).toEqual({ id: 7 });
    expect(api.get).toHaveBeenCalledWith("/schools/4/widgets/7", {});
  });

  it("creates an item", async () => {
    api.post.mockResolvedValue({ data: { data: { id: 8 } } });

    expect(await widgets.create(4, { title: "X" })).toEqual({ id: 8 });
    expect(api.post).toHaveBeenCalledWith("/schools/4/widgets", { title: "X" });
  });

  it("updates an item with a PATCH", async () => {
    api.patch.mockResolvedValue({ data: { data: { id: 8, title: "Y" } } });

    expect(await widgets.update(4, 8, { title: "Y" })).toEqual({
      id: 8,
      title: "Y",
    });
    expect(api.patch).toHaveBeenCalledWith("/schools/4/widgets/8", {
      title: "Y",
    });
  });

  it("removes an item", async () => {
    api.delete.mockResolvedValue({});

    await widgets.remove(4, 8);

    expect(api.delete).toHaveBeenCalledWith("/schools/4/widgets/8");
  });
});
