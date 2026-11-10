import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { gradesApi, sectionsApi } from "../lib/academicApi";
import { getSchool } from "../lib/schoolsApi";
import SchoolGrades from "./SchoolGrades";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({ getSchool: vi.fn() }));
vi.mock("../lib/academicApi", () => ({
  gradesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  sectionsApi: { list: vi.fn() },
}));

const north = { id: 1, name: "North" };
const sectionA = { id: 1, title: "A", status: "active" };
const sectionB = { id: 2, title: "B", status: "inactive" };
const sectionC = { id: 3, title: "C", status: "active" };
const allSections = [sectionA, sectionB, sectionC];

const grade1 = {
  id: 1,
  title: "Grade 1",
  status: "active",
  sections: [sectionA, sectionB],
};
const grade2 = { id: 2, title: "Grade 2", status: "inactive", sections: [] };

const asAdmin = {
  id: 10,
  is_super_admin: false,
  schools: [{ id: 1, role: "admin" }],
};
const asTeacher = {
  id: 11,
  is_super_admin: false,
  schools: [{ id: 1, role: "teacher" }],
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/schools/1/grades"]}>
      <Routes>
        <Route path="/schools/:id/grades" element={<SchoolGrades />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setup(user, grades = [grade1, grade2], sections = allSections) {
  useAuth.mockReturnValue({ user });
  getSchool.mockResolvedValue(north);
  gradesApi.list.mockResolvedValue(grades);
  sectionsApi.list.mockResolvedValue(sections);
  renderPage();
}

describe("SchoolGrades", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists the grades with their sections for a teacher, without editing controls", async () => {
    setup(asTeacher);

    expect(
      await screen.findByRole("heading", { name: "Grades of North" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Grade 1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "A, B" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Edit|Delete) / }),
    ).not.toBeInTheDocument();
  });

  it("shows the add form, the section checkboxes and the row buttons to a school admin", async () => {
    setup(asAdmin);

    expect(
      await screen.findByRole("heading", { name: "Add a grade" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Grade" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "A" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "B (inactive)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Grade 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Grade 1" }),
    ).toBeInTheDocument();
  });

  it("says so when there are no grades", async () => {
    setup(asAdmin, []);

    expect(
      await screen.findByText("No grades yet. Add the first one below."),
    ).toBeInTheDocument();
  });

  it("tells an admin to add sections first when the school has none", async () => {
    setup(asAdmin, [grade2], []);

    expect(await screen.findByText(/no sections yet/i)).toBeInTheDocument();
  });

  it("shows an error when the grades can't be loaded", async () => {
    useAuth.mockReturnValue({ user: asAdmin });
    getSchool.mockRejectedValue({ response: { status: 403 } });
    gradesApi.list.mockResolvedValue([]);
    sectionsApi.list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
  });

  it("adds a grade with the chosen sections, clears the form and focuses it", async () => {
    gradesApi.create.mockResolvedValue({
      id: 3,
      title: "Grade 3",
      status: "active",
      sections: [sectionA],
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "Grade 3");
    await actor.click(screen.getByRole("checkbox", { name: "A" }));
    await actor.click(screen.getByRole("button", { name: "Add grade" }));

    expect(gradesApi.create).toHaveBeenCalledWith(1, {
      title: "Grade 3",
      status: "active",
      section_ids: [1],
    });
    expect(await screen.findByText("Grade 3 was added.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Grade 3" })).toBeInTheDocument();

    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("");
    expect(title).toHaveFocus();
    expect(screen.getByRole("checkbox", { name: "A" })).not.toBeChecked();
  });

  it("keeps the list sorted by title, with numbers in numeric order", async () => {
    const grade10 = {
      id: 10,
      title: "Grade 10",
      status: "active",
      sections: [],
    };
    gradesApi.create.mockResolvedValue({
      id: 11,
      title: "Grade 2",
      status: "active",
      sections: [],
    });
    setup(asAdmin, [grade10, grade1]);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "Grade 2");
    await actor.click(screen.getByRole("button", { name: "Add grade" }));
    await screen.findByText("Grade 2 was added.");

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[0].textContent),
    ).toEqual(["Grade 1", "Grade 2", "Grade 10"]);
  });

  it("shows the server's message when the title is taken", async () => {
    gradesApi.create.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { title: ["The title has already been taken."] } },
      },
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "Grade 1");
    await actor.click(screen.getByRole("button", { name: "Add grade" }));

    expect(
      await screen.findByText("The title has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + two grades, unchanged
  });

  it("edits a grade and its sections in the same form", async () => {
    gradesApi.update.mockResolvedValue({
      ...grade1,
      sections: [sectionB, sectionC],
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Edit Grade 1" }),
    );

    expect(
      screen.getByRole("heading", { name: "Edit Grade 1" }),
    ).toBeInTheDocument();
    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("Grade 1");
    expect(title).toHaveFocus();
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "B (inactive)" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "C" })).not.toBeChecked();

    await actor.click(screen.getByRole("checkbox", { name: "A" }));
    await actor.click(screen.getByRole("checkbox", { name: "C" }));
    await actor.click(screen.getByRole("button", { name: "Save changes" }));

    expect(gradesApi.update).toHaveBeenCalledWith(1, 1, {
      title: "Grade 1",
      status: "active",
      section_ids: [2, 3],
    });
    expect(await screen.findByText("Grade 1 was saved.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "B, C" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Add a grade" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Grades of North" }),
    ).toHaveFocus();
  });

  it("cancels editing and returns focus to the Edit button", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const editButton = await screen.findByRole("button", {
      name: "Edit Grade 1",
    });
    await actor.click(editButton);
    await actor.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("heading", { name: "Add a grade" }),
    ).toBeInTheDocument();
    expect(editButton).toHaveFocus();
  });

  it("asks for confirmation before deleting and focuses Cancel", async () => {
    setup(asAdmin);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Delete Grade 1" }));

    expect(
      await screen.findByRole("region", { name: "Delete Grade 1?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(gradesApi.remove).not.toHaveBeenCalled();
  });

  it("returns focus to the Delete button when cancelled", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Grade 1",
    });
    await actor.click(deleteButton);
    await actor.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("region", { name: "Delete Grade 1?" }),
    ).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it("deletes after confirmation and keeps focus on the heading", async () => {
    gradesApi.remove.mockResolvedValue();
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete Grade 1" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete grade" }),
    );

    expect(gradesApi.remove).toHaveBeenCalledWith(1, 1);
    expect(await screen.findByText("Grade 1 was deleted.")).toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "Grade 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Grades of North" }),
    ).toHaveFocus();
  });

  it("shows an error and keeps the grade when deleting fails", async () => {
    gradesApi.remove.mockRejectedValue({ response: { status: 403 } });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete Grade 1" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete grade" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
    expect(screen.getByRole("cell", { name: "Grade 1" })).toBeInTheDocument();
  });
});
