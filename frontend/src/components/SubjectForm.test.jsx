import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SubjectForm from "./SubjectForm";

const empty = { title: "", code: "", type: "theory", status: "active" };

function setup(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue();
  render(
    <SubjectForm
      initialValues={empty}
      submitLabel="Add subject"
      {...props}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit, actor: userEvent.setup() };
}

describe("SubjectForm", () => {
  it("shows a title, a code, a type and a status with sensible defaults", () => {
    setup();

    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Code")).toHaveValue("");
    expect(screen.getByLabelText("Type")).toHaveValue("theory");
    expect(screen.getByLabelText("Status")).toHaveValue("active");
  });

  it("starts with the given values", () => {
    setup({
      initialValues: {
        title: "Physics Lab",
        code: "PHY-LAB",
        type: "practical",
        status: "inactive",
      },
    });

    expect(screen.getByLabelText("Title")).toHaveValue("Physics Lab");
    expect(screen.getByLabelText("Code")).toHaveValue("PHY-LAB");
    expect(screen.getByLabelText("Type")).toHaveValue("practical");
    expect(screen.getByLabelText("Status")).toHaveValue("inactive");
  });

  it("submits what was typed", async () => {
    const { onSubmit, actor } = setup();

    await actor.type(screen.getByLabelText("Title"), "Mathematics");
    await actor.type(screen.getByLabelText("Code"), "math");
    await actor.selectOptions(screen.getByLabelText("Type"), "practical");
    await actor.click(screen.getByRole("button", { name: "Add subject" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Mathematics",
      code: "math",
      type: "practical",
      status: "active",
    });
  });

  it("explains the code format in a hint", () => {
    setup();

    expect(screen.getByLabelText("Code")).toHaveAccessibleDescription(
      expect.stringContaining("Saved in capitals"),
    );
  });

  it("shows validation errors next to their fields", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { code: ["The code has already been taken."] } },
      },
    });
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Add subject" }));

    expect(
      await screen.findByText("The code has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please fix the highlighted fields.",
    );
  });

  it("offers Cancel only when it is given a way to cancel", async () => {
    const { unmount } = render(
      <SubjectForm
        initialValues={empty}
        submitLabel="Add subject"
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    unmount();

    const onCancel = vi.fn();
    render(
      <SubjectForm
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

  it("disables the button while saving", async () => {
    const onSubmit = vi.fn().mockReturnValue(new Promise(() => {})); // never finishes
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Add subject" }));

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
  });
});
