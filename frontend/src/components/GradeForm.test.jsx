import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GradeForm from "./GradeForm";

const sectionOptions = [
  { id: 1, label: "A" },
  { id: 2, label: "B" },
];
const empty = { title: "", status: "active", section_ids: [] };

function setup(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue();
  render(
    <GradeForm
      initialValues={empty}
      sectionOptions={sectionOptions}
      submitLabel="Add grade"
      {...props}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit, actor: userEvent.setup() };
}

describe("GradeForm", () => {
  it("shows a title, a status and a checkbox for each section", () => {
    setup();

    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Status")).toHaveValue("active");
    expect(screen.getByRole("group", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "A" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "B" })).not.toBeChecked();
  });

  it("starts with the given values", () => {
    setup({
      initialValues: { title: "Grade 1", status: "inactive", section_ids: [2] },
    });

    expect(screen.getByLabelText("Title")).toHaveValue("Grade 1");
    expect(screen.getByLabelText("Status")).toHaveValue("inactive");
    expect(screen.getByRole("checkbox", { name: "A" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
  });

  it("submits the title, status and chosen sections", async () => {
    const { onSubmit, actor } = setup();

    await actor.type(screen.getByLabelText("Title"), "Grade 1");
    await actor.click(screen.getByRole("checkbox", { name: "A" }));
    await actor.click(screen.getByRole("checkbox", { name: "B" }));
    await actor.click(screen.getByRole("button", { name: "Add grade" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Grade 1",
      status: "active",
      section_ids: [1, 2],
    });
  });

  it("lets a chosen section be unticked", async () => {
    const { onSubmit, actor } = setup({
      initialValues: {
        title: "Grade 1",
        status: "active",
        section_ids: [1, 2],
      },
    });

    await actor.click(screen.getByRole("checkbox", { name: "A" }));
    await actor.click(screen.getByRole("button", { name: "Add grade" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Grade 1",
      status: "active",
      section_ids: [2],
    });
  });

  it("shows validation errors next to the field", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { title: ["The title has already been taken."] } },
      },
    });
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Add grade" }));

    expect(
      await screen.findByText("The title has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("offers Cancel only when it is given a way to cancel", async () => {
    const { unmount } = render(
      <GradeForm
        initialValues={empty}
        sectionOptions={[]}
        submitLabel="Add grade"
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    unmount();

    const onCancel = vi.fn();
    render(
      <GradeForm
        initialValues={empty}
        sectionOptions={[]}
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

    await actor.click(screen.getByRole("button", { name: "Add grade" }));

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
  });
});
