import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { gradesApi, subjectGroupsApi, subjectsApi } from "../lib/academicApi";
import { getSchool } from "../lib/schoolsApi";
import SchoolSubjectGroups from "./SchoolSubjectGroups";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({ getSchool: vi.fn() }));
vi.mock("../lib/academicApi", () => ({
  subjectGroupsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  gradesApi: { list: vi.fn() },
  subjectsApi: { list: vi.fn() },
}));

const north = { id: 1, name: "North" };

const sectionA = { id: 1, title: "A", status: "active" };
const sectionB = { id: 2, title: "B", status: "active" };
const sectionC = { id: 3, title: "C", status: "active" };

const grade1 = {
  id: 1,
  title: "Grade 1",
  status: "active",
  sections: [sectionA, sectionB],
};
const grade2 = {
  id: 2,
  title: "Grade 2",
  status: "active",
  sections: [sectionC],
};

const math = {
  id: 1,
  title: "Mathematics",
  code: "MATH",
  type: "theory",
  status: "active",
};
const english = {
  id: 2,
  title: "English",
  code: "ENG",
  type: "theory",
  status: "active",
};

const core = {
  id: 1,
  grade_id: 1,
  title: "Core subjects",
  description: "Compulsory.",
  grade: { id: 1, title: "Grade 1" },
  sections: [sectionA, sectionB],
  subjects: [english, math],
};
const arts = {
  id: 2,
  grade_id: 2,
  title: "Arts",
  description: null,
  grade: { id: 2, title: "Grade 2" },
  sections: [],
  subjects: [],
};

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
    <MemoryRouter initialEntries={["/schools/1/subject-groups"]}>
      <Routes>
        <Route
          path="/schools/:id/subject-groups"
          element={<SchoolSubjectGroups />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function setup(
  user,
  groups = [core, arts],
  grades = [grade1, grade2],
  subjects = [math, english],
) {
  useAuth.mockReturnValue({ user });
  getSchool.mockResolvedValue(north);
  subjectGroupsApi.list.mockResolvedValue(groups);
  gradesApi.list.mockResolvedValue(grades);
  subjectsApi.list.mockResolvedValue(subjects);
  renderPage();
}

describe("SchoolSubjectGroups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists the groups with grade, sections and subjects for a teacher, without editing controls", async () => {
    setup(asTeacher);

    expect(
      await screen.findByRole("heading", { name: "Subject groups of North" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Core subjects" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Grade 1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "A, B" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "ENG, MATH" })).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Edit|Delete) / }),
    ).not.toBeInTheDocument();
  });

  it("shows the add form and the row buttons to a school admin", async () => {
    setup(asAdmin);

    expect(
      await screen.findByRole("heading", { name: "Add a subject group" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Subject group" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Core subjects (Grade 1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Arts (Grade 2)" }),
    ).toBeInTheDocument();
  });

  it("says so when there are no subject groups", async () => {
    setup(asAdmin, []);

    expect(
      await screen.findByText(
        "No subject groups yet. Add the first one below.",
      ),
    ).toBeInTheDocument();
  });

  it("tells an admin to add grades first when the school has none", async () => {
    setup(asAdmin, [], [], []);

    expect(await screen.findByText(/no grades yet/i)).toBeInTheDocument();
  });

  it("shows an error when the groups can't be loaded", async () => {
    useAuth.mockReturnValue({ user: asAdmin });
    getSchool.mockRejectedValue({ response: { status: 403 } });
    subjectGroupsApi.list.mockResolvedValue([]);
    gradesApi.list.mockResolvedValue([]);
    subjectsApi.list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
  });

  it("adds a group, clears the form and focuses it for the next one", async () => {
    subjectGroupsApi.create.mockResolvedValue({
      id: 3,
      grade_id: 1,
      title: "Science",
      description: null,
      grade: { id: 1, title: "Grade 1" },
      sections: [sectionA],
      subjects: [math],
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.selectOptions(await screen.findByLabelText("Grade"), "Grade 1");
    await actor.type(screen.getByLabelText("Title"), "Science");
    await actor.click(screen.getByRole("checkbox", { name: "A" }));
    await actor.click(
      screen.getByRole("checkbox", { name: "Mathematics (MATH)" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Add subject group" }),
    );

    expect(subjectGroupsApi.create).toHaveBeenCalledWith(1, {
      grade_id: 1,
      title: "Science",
      description: "",
      section_ids: [1],
      subject_ids: [1],
    });
    expect(
      await screen.findByText("Science (Grade 1) was added."),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Science" })).toBeInTheDocument();

    const grade = screen.getByLabelText("Grade");
    expect(grade).toHaveValue("");
    expect(grade).toHaveFocus();
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("sorts by grade, then by title", async () => {
    subjectGroupsApi.create.mockResolvedValue({
      id: 5,
      grade_id: 1,
      title: "Core",
      description: null,
      grade: { id: 1, title: "Grade 1" },
      sections: [],
      subjects: [],
    });
    const science = {
      id: 4,
      grade_id: 1,
      title: "Science",
      description: null,
      grade: { id: 1, title: "Grade 1" },
      sections: [],
      subjects: [],
    };
    setup(asAdmin, [arts, science]);
    const actor = userEvent.setup();

    await actor.selectOptions(await screen.findByLabelText("Grade"), "Grade 1");
    await actor.type(screen.getByLabelText("Title"), "Core");
    await actor.click(
      screen.getByRole("button", { name: "Add subject group" }),
    );
    await screen.findByText("Core (Grade 1) was added.");

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[0].textContent),
    ).toEqual(["Core", "Science", "Arts"]);
  });

  it("shows the server's message when the title is taken", async () => {
    subjectGroupsApi.create.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { title: ["The title has already been taken."] } },
      },
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.selectOptions(await screen.findByLabelText("Grade"), "Grade 1");
    await actor.type(screen.getByLabelText("Title"), "Core subjects");
    await actor.click(
      screen.getByRole("button", { name: "Add subject group" }),
    );

    expect(
      await screen.findByText("The title has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + two groups, unchanged
  });

  it("edits a group with its grade locked", async () => {
    subjectGroupsApi.update.mockResolvedValue({ ...core, title: "Compulsory" });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", {
        name: "Edit Core subjects (Grade 1)",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Edit Core subjects (Grade 1)" }),
    ).toBeInTheDocument();
    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("Core subjects");
    expect(title).toHaveFocus();
    expect(screen.getByLabelText("Grade")).toBeDisabled();
    expect(screen.getByLabelText("Grade")).toHaveValue("1");
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Mathematics (MATH)" }),
    ).toBeChecked();

    await actor.clear(title);
    await actor.type(title, "Compulsory");
    await actor.click(screen.getByRole("button", { name: "Save changes" }));

    expect(subjectGroupsApi.update).toHaveBeenCalledWith(1, 1, {
      title: "Compulsory",
      description: "Compulsory.",
      section_ids: [1, 2],
      subject_ids: [2, 1],
    });
    expect(
      await screen.findByText("Compulsory (Grade 1) was saved."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Compulsory" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Add a subject group" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Subject groups of North" }),
    ).toHaveFocus();
  });

  it("cancels editing and returns focus to the Edit button", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const editButton = await screen.findByRole("button", {
      name: "Edit Core subjects (Grade 1)",
    });
    await actor.click(editButton);
    await actor.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("heading", { name: "Add a subject group" }),
    ).toBeInTheDocument();
    expect(editButton).toHaveFocus();
  });

  it("asks for confirmation before deleting and focuses Cancel", async () => {
    setup(asAdmin);

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", {
          name: "Delete Core subjects (Grade 1)",
        }),
      );

    expect(
      await screen.findByRole("region", {
        name: "Delete Core subjects (Grade 1)?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(subjectGroupsApi.remove).not.toHaveBeenCalled();
  });

  it("returns focus to the Delete button when cancelled", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Core subjects (Grade 1)",
    });
    await actor.click(deleteButton);
    await actor.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("region", { name: "Delete Core subjects (Grade 1)?" }),
    ).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it("deletes after confirmation and keeps focus on the heading", async () => {
    subjectGroupsApi.remove.mockResolvedValue();
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", {
        name: "Delete Core subjects (Grade 1)",
      }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete subject group" }),
    );

    expect(subjectGroupsApi.remove).toHaveBeenCalledWith(1, 1);
    expect(
      await screen.findByText("Core subjects (Grade 1) was deleted."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "Core subjects" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Subject groups of North" }),
    ).toHaveFocus();
  });

  it("shows an error and keeps the group when deleting fails", async () => {
    subjectGroupsApi.remove.mockRejectedValue({ response: { status: 403 } });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", {
        name: "Delete Core subjects (Grade 1)",
      }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete subject group" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
    expect(
      screen.getByRole("cell", { name: "Core subjects" }),
    ).toBeInTheDocument();
  });
});
