import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSchool } from "./schoolsApi";
import { byTitle } from "./sorting";
import { useCrudPage } from "./useCrudPage";

vi.mock("./schoolsApi", () => ({ getSchool: vi.fn() }));

const api = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

const config = {
  api,
  sort: byTitle,
  loadError: "We couldn't load the items.",
  messages: {
    added: (item) => `${item.title} was added.`,
    saved: (item) => `${item.title} was saved.`,
    deleted: (item) => `${item.title} was deleted.`,
  },
};

const school = { id: 1, name: "North" };
const a = { id: 1, title: "A" };
const b = { id: 2, title: "B" };

const click = () => ({ currentTarget: document.createElement("button") });
const titles = (hook) =>
  hook.result.current.state.items.map((item) => item.title);

async function setup(items = [b, a], hookConfig = config) {
  getSchool.mockResolvedValue(school);
  api.list.mockResolvedValue(items);

  const hook = renderHook(() => useCrudPage(1, hookConfig));
  await waitFor(() => expect(hook.result.current.state.status).toBe("ok"));

  return hook;
}

describe("useCrudPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads the school and the items, sorted", async () => {
    const hook = await setup();

    expect(hook.result.current.state.school).toEqual(school);
    expect(titles(hook)).toEqual(["A", "B"]);
  });

  it("merges the extra data into the state", async () => {
    const loadExtra = vi.fn().mockResolvedValue({ sections: [{ id: 9 }] });
    const hook = await setup([a], { ...config, loadExtra });

    expect(hook.result.current.state.sections).toEqual([{ id: 9 }]);
    expect(loadExtra).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("reports a load error", async () => {
    getSchool.mockRejectedValue({ response: { status: 403 } });
    api.list.mockResolvedValue([]);

    const { result } = renderHook(() => useCrudPage(1, config));

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state.message).toBe(
      "You don't have permission to do that.",
    );
  });

  it("adds an item in sorted position, says so and gets ready for the next one", async () => {
    api.create.mockResolvedValue({ id: 3, title: "AA" });
    const hook = await setup();

    await act(async () => {
      await hook.result.current.save({ title: "AA" });
    });

    expect(api.create).toHaveBeenCalledWith(1, { title: "AA" });
    expect(titles(hook)).toEqual(["A", "AA", "B"]);
    expect(hook.result.current.notice).toBe("AA was added.");
    expect(hook.result.current.focusForm).toBe(true);
    expect(hook.result.current.formKey).toBe(1);
  });

  it("updates the item being edited", async () => {
    api.update.mockResolvedValue({ id: 1, title: "Alpha" });
    const hook = await setup();

    act(() => hook.result.current.startEditing(a, click()));
    expect(hook.result.current.editing).toEqual(a);

    await act(async () => {
      await hook.result.current.save({ title: "Alpha" });
    });

    expect(api.update).toHaveBeenCalledWith(1, 1, { title: "Alpha" });
    expect(titles(hook)).toEqual(["Alpha", "B"]);
    expect(hook.result.current.notice).toBe("Alpha was saved.");
    expect(hook.result.current.editing).toBeNull();
    expect(hook.result.current.focusForm).toBe(false);
  });

  it("removes a deleted item and says so", async () => {
    api.remove.mockResolvedValue();
    const hook = await setup();

    act(() => hook.result.current.askToDelete(a, click()));
    await act(async () => {
      await hook.result.current.confirmDelete();
    });

    expect(api.remove).toHaveBeenCalledWith(1, 1);
    expect(titles(hook)).toEqual(["B"]);
    expect(hook.result.current.notice).toBe("A was deleted.");
    expect(hook.result.current.deleting).toBeNull();
  });

  it("keeps the item and reports the problem when deleting fails", async () => {
    api.remove.mockRejectedValue({ response: { status: 403 } });
    const hook = await setup();

    act(() => hook.result.current.askToDelete(a, click()));
    await act(async () => {
      await hook.result.current.confirmDelete();
    });

    expect(titles(hook)).toEqual(["A", "B"]);
    expect(hook.result.current.deleteError).toBe(
      "You don't have permission to do that.",
    );
    expect(hook.result.current.deleting).toEqual(a);
  });
});
