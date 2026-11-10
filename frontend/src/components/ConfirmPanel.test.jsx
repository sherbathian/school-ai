import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmPanel from "./ConfirmPanel";

function setup(props = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmPanel
      title="Delete A?"
      confirmLabel="Yes, delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      <p>This can't be undone.</p>
    </ConfirmPanel>,
  );

  return { onConfirm, onCancel, actor: userEvent.setup() };
}

describe("ConfirmPanel", () => {
  it("is a region named by its title, with the explanation inside", () => {
    setup();

    expect(
      screen.getByRole("region", { name: "Delete A?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
  });

  it("puts focus on Cancel when it appears", () => {
    setup();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("calls onConfirm", async () => {
    const { onConfirm, actor } = setup();

    await actor.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel", async () => {
    const { onCancel, actor } = setup();

    await actor.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows an error when given one", () => {
    setup({ error: "Something failed." });

    expect(screen.getByRole("alert")).toHaveTextContent("Something failed.");
  });
});
