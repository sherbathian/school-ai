import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SubjectGroupForm from "./SubjectGroupForm";

const a = { id: 1, title: "A", status: "active" };
const b = { id: 2, title: "B", status: "active" };
const c = { id: 3, title: "C", status: "inactive" };

const grades = [
  { id: 1, title: "Grade 1", sections: [a, b] },
  { id: 2, title: "Grade 2", sections: [c] },
  { id: 3, title: "Grade 3", sections: [b] },
];

const subjects = [
  { id: 1, title: "Mathematics", code: "MATH", status: "active" },
  { id: 2, title: "Physics Lab", code: "PHY-LAB", status: "inactive" },
];

const empty = {
  grade_id: "",
  title: "",
  description: "",
  section_ids: [],
  subject_ids: [],
};

function setup(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue();
  render(
    <SubjectGroupForm
      initialValues={empty}
      grades={grades}
      subjects={subjects}
      submitLabel="Add subject group"
      {...props}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit, actor: userEvent.setup() };
}

const sectionsGroup = () => screen.getByRole("group", { name: "Sections" });

describe("SubjectGroupForm", () => {
  it("shows a grade, a title, a description and both checkbox lists", () => {
    setup();

    expect(screen.getByLabelText("Grade")).toHaveValue("");
    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(
      within(sectionsGroup()).getByText("Choose a grade to see its sections."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Mathematics (MATH)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Physics Lab (PHY-LAB, inactive)" }),
    ).toBeInTheDocument();
  });

  it("offers only the sections of the chosen grade", async () => {
    const { actor } = setup();

    await actor.selectOptions(screen.getByLabelText("Grade"), "Grade 1");
    expect(
      within(sectionsGroup())
        .getAllByRole("checkbox")
        .map((box) => box.closest("label").textContent),
    ).toEqual(["A", "B"]);

    await actor.selectOptions(screen.getByLabelText("Grade"), "Grade 2");
    expect(
      within(sectionsGroup())
        .getAllByRole("checkbox")
        .map((box) => box.closest("label").textContent),
    ).toEqual(["C (inactive)"]);
  });

  it("drops chosen sections that the newly chosen grade does not have", async () => {
    const { onSubmit, actor } = setup();

    await actor.selectOptions(screen.getByLabelText("Grade"), "Grade 1");
    await actor.click(screen.getByRole("checkbox", { name: "A" }));
    await actor.selectOptions(screen.getByLabelText("Grade"), "Grade 2");
    await actor.click(
      screen.getByRole("button", { name: "Add subject group" }),
    );

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ grade_id: 2, section_ids: [] }),
    );
  });

  it("keeps a chosen section that the newly chosen grade also has", async () => {
    const { actor } = setup();

    await actor.selectOptions(screen.getByLabelText("Grade"), "Grade 1");
    await actor.click(screen.getByRole("checkbox", { name: "B" }));
    await actor.selectOptions(screen.getByLabelText("Grade"), "Grade 3");

    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
  });

  it("submits everything that was chosen", async () => {
    const { onSubmit, actor } = setup();

    await actor.selectOptions(screen.getByLabelText("Grade"), "Grade 1");
    await actor.type(screen.getByLabelText("Title"), "Core");
    await actor.type(screen.getByLabelText("Description"), "Compulsory");
    await actor.click(screen.getByRole("checkbox", { name: "A" }));
    await actor.click(
      screen.getByRole("checkbox", { name: "Mathematics (MATH)" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Add subject group" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      grade_id: 1,
      title: "Core",
      description: "Compulsory",
      section_ids: [1],
      subject_ids: [1],
    });
  });

  it("shows the grade but locks it when editing, and does not submit it", async () => {
    const { onSubmit, actor } = setup({
      gradeLocked: true,
      initialValues: {
        grade_id: 1,
        title: "Core",
        description: "",
        section_ids: [1],
        subject_ids: [],
      },
      submitLabel: "Save changes",
    });

    const grade = screen.getByLabelText("Grade");
    expect(grade).toBeDisabled();
    expect(grade).toHaveValue("1");
    expect(grade).toHaveAccessibleDescription(
      "A group's grade can't be changed.",
    );

    await actor.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Core",
      description: "",
      section_ids: [1],
      subject_ids: [],
    });
  });

  it("starts with the given values", () => {
    setup({
      initialValues: {
        grade_id: 1,
        title: "Core",
        description: "Text",
        section_ids: [2],
        subject_ids: [1],
      },
    });

    expect(screen.getByLabelText("Grade")).toHaveValue("1");
    expect(screen.getByLabelText("Title")).toHaveValue("Core");
    expect(screen.getByLabelText("Description")).toHaveValue("Text");
    expect(screen.getByRole("checkbox", { name: "A" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Mathematics (MATH)" }),
    ).toBeChecked();
  });

  it("shows validation errors next to their fields", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: {
          errors: {
            title: ["The title has already been taken."],
            "section_ids.0": ["The selected section ids.0 is invalid."],
          },
        },
      },
    });
    const { actor } = setup({ onSubmit });

    await actor.click(
      screen.getByRole("button", { name: "Add subject group" }),
    );

    expect(
      await screen.findByText("The title has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(sectionsGroup()).toHaveAccessibleDescription(
      "The selected section ids.0 is invalid.",
    );
  });

  it("tells the user to add grades first when there are none", () => {
    setup({ grades: [] });

    expect(screen.getByLabelText("Grade")).toHaveAccessibleDescription(
      /no grades yet/,
    );
  });

  it("offers Cancel only when it is given a way to cancel", async () => {
    const { unmount } = render(
      <SubjectGroupForm
        initialValues={empty}
        grades={grades}
        subjects={subjects}
        submitLabel="Add subject group"
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    unmount();

    const onCancel = vi.fn();
    render(
      <SubjectGroupForm
        initialValues={empty}
        grades={grades}
        subjects={subjects}
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

    await actor.click(
      screen.getByRole("button", { name: "Add subject group" }),
    );

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
  });
});
