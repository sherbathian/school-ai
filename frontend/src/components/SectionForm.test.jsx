import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SectionForm from "./SectionForm";

const empty = { title: "", status: "active" };

function setup(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue();
  render(
    <SectionForm
      initialValues={empty}
      submitLabel="Add section"
      {...props}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit, actor: userEvent.setup() };
}

describe("SectionForm", () => {
  it("shows a title field and a status that starts as Active", () => {
    setup();

    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Status")).toHaveValue("active");
  });

  it("starts with the given values", () => {
    setup({ initialValues: { title: "B", status: "inactive" } });

    expect(screen.getByLabelText("Title")).toHaveValue("B");
    expect(screen.getByLabelText("Status")).toHaveValue("inactive");
  });

  it("submits what was typed", async () => {
    const { onSubmit, actor } = setup();

    await actor.type(screen.getByLabelText("Title"), "A");
    await actor.selectOptions(screen.getByLabelText("Status"), "inactive");
    await actor.click(screen.getByRole("button", { name: "Add section" }));

    expect(onSubmit).toHaveBeenCalledWith({ title: "A", status: "inactive" });
  });

  it("shows validation errors next to the field", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { title: ["The title has already been taken."] } },
      },
    });
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Add section" }));

    expect(
      await screen.findByText("The title has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
      "The title has already been taken.",
    );
  });

  it("offers Cancel only when it is given a way to cancel", async () => {
    const { unmount } = render(
      <SectionForm
        initialValues={empty}
        submitLabel="Add section"
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    unmount();

    const onCancel = vi.fn();
    render(
      <SectionForm
        initialValues={empty}
        submitLabel="Save changes"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("focuses the title when asked to", () => {
    setup({ autoFocus: true });

    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("disables the button while saving", async () => {
    const onSubmit = vi.fn().mockReturnValue(new Promise(() => {})); // never finishes
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Add section" }));

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
  });
});
