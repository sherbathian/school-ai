import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useApiForm } from "./useApiForm";

const unprocessable = (errors) => ({
  response: { status: 422, data: { errors } },
});

describe("useApiForm", () => {
  it("starts with no errors and not submitting", () => {
    const { result } = renderHook(() => useApiForm(vi.fn()));

    expect(result.current.errors).toEqual({});
    expect(result.current.formError).toBe("");
    expect(result.current.submitting).toBe(false);
  });

  it("passes the values on and stays in the submitting state after success", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useApiForm(onSubmit));

    await act(async () => {
      await result.current.submit({ name: "North" });
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: "North" });
    expect(result.current.submitting).toBe(true);
    expect(result.current.formError).toBe("");
  });

  it("maps a 422 to field errors and a summary", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(unprocessable({ name: ["Required."] }));
    const { result } = renderHook(() => useApiForm(onSubmit));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.errors).toEqual({ name: "Required." });
    expect(result.current.formError).toBe("Please fix the highlighted fields.");
    expect(result.current.submitting).toBe(false);
  });

  it("shows a general message for other errors", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { status: 403 } });
    const { result } = renderHook(() => useApiForm(onSubmit));

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.formError).toBe(
      "You don't have permission to do that.",
    );
    expect(result.current.submitting).toBe(false);
  });

  it("clears earlier errors when submitted again", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(unprocessable({ name: ["Required."] }))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => useApiForm(onSubmit));

    await act(async () => {
      await result.current.submit({});
    });
    await act(async () => {
      await result.current.submit({ name: "North" });
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.formError).toBe("");
  });
});
