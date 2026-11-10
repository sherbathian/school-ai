import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { subjectsApi } from "../lib/academicApi";
import { getSchool } from "../lib/schoolsApi";
import SchoolSubjects from "./SchoolSubjects";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({ getSchool: vi.fn() }));
vi.mock("../lib/academicApi", () => ({
  subjectsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const north = { id: 1, name: "North" };
const math = {
  id: 1,
  title: "Mathematics",
  code: "MATH",
  type: "theory",
  status: "active",
};
const lab = {
  id: 2,
  title: "Physics Lab",
  code: "PHY-LAB",
  type: "practical",
  status: "inactive",
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
    <MemoryRouter initialEntries={["/schools/1/subjects"]}>
      <Routes>
        <Route path="/schools/:id/subjects" element={<SchoolSubjects />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setup(user, subjects = [math, lab]) {
  useAuth.mockReturnValue({ user });
  getSchool.mockResolvedValue(north);
  subjectsApi.list.mockResolvedValue(subjects);
  renderPage();
}

describe("SchoolSubjects", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists the subjects with code and type for a teacher, without editing controls", async () => {
    setup(asTeacher);

    expect(
      await screen.findByRole("heading", { name: "Subjects of North" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "MATH" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Practical" })).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Edit|Delete) / }),
    ).not.toBeInTheDocument();
  });

  it("shows the add form and the row buttons to a school admin", async () => {
    setup(asAdmin);

    expect(
      await screen.findByRole("heading", { name: "Add a subject" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Subject" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit MATH" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete MATH" }),
    ).toBeInTheDocument();
  });

  it("says so when there are no subjects", async () => {
    setup(asAdmin, []);

    expect(
      await screen.findByText("No subjects yet. Add the first one below."),
    ).toBeInTheDocument();
  });

  it("shows an error when the subjects can't be loaded", async () => {
    useAuth.mockReturnValue({ user: asAdmin });
    getSchool.mockRejectedValue({ response: { status: 403 } });
    subjectsApi.list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
  });

  it("adds a subject, clears the form and focuses it for the next one", async () => {
    subjectsApi.create.mockResolvedValue({
      id: 3,
      title: "Chemistry",
      code: "CHEM",
      type: "practical",
      status: "active",
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "Chemistry");
    await actor.type(screen.getByLabelText("Code"), "chem");
    await actor.selectOptions(screen.getByLabelText("Type"), "practical");
    await actor.click(screen.getByRole("button", { name: "Add subject" }));

    expect(subjectsApi.create).toHaveBeenCalledWith(1, {
      title: "Chemistry",
      code: "chem",
      type: "practical",
      status: "active",
    });
    expect(
      await screen.findByText("Chemistry (CHEM) was added."),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "CHEM" })).toBeInTheDocument();

    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("");
    expect(title).toHaveFocus();
  });

  it("sorts by title, with the code breaking ties", async () => {
    const mathPractical = {
      id: 5,
      title: "Mathematics",
      code: "MATH-P",
      type: "practical",
      status: "active",
    };
    subjectsApi.create.mockResolvedValue({
      id: 6,
      title: "English",
      code: "ENG",
      type: "theory",
      status: "active",
    });
    setup(asAdmin, [mathPractical, math]);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "English");
    await actor.type(screen.getByLabelText("Code"), "ENG");
    await actor.click(screen.getByRole("button", { name: "Add subject" }));
    await screen.findByText("English (ENG) was added.");

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[1].textContent),
    ).toEqual(["ENG", "MATH", "MATH-P"]);
  });

  it("shows the server's message when the code is taken", async () => {
    subjectsApi.create.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { code: ["The code has already been taken."] } },
      },
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "Maths");
    await actor.type(screen.getByLabelText("Code"), "math");
    await actor.click(screen.getByRole("button", { name: "Add subject" }));

    expect(
      await screen.findByText("The code has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + two subjects, unchanged
  });

  it("edits a subject in the same form", async () => {
    subjectsApi.update.mockResolvedValue({ ...math, title: "Maths" });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(await screen.findByRole("button", { name: "Edit MATH" }));

    expect(
      screen.getByRole("heading", { name: "Edit Mathematics (MATH)" }),
    ).toBeInTheDocument();
    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("Mathematics");
    expect(title).toHaveFocus();
    expect(screen.getByLabelText("Code")).toHaveValue("MATH");
    expect(screen.getByLabelText("Type")).toHaveValue("theory");

    await actor.clear(title);
    await actor.type(title, "Maths");
    await actor.click(screen.getByRole("button", { name: "Save changes" }));

    expect(subjectsApi.update).toHaveBeenCalledWith(1, 1, {
      title: "Maths",
      code: "MATH",
      type: "theory",
      status: "active",
    });
    expect(
      await screen.findByText("Maths (MATH) was saved."),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Maths" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Add a subject" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Subjects of North" }),
    ).toHaveFocus();
  });

  it("cancels editing and returns focus to the Edit button", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const editButton = await screen.findByRole("button", { name: "Edit MATH" });
    await actor.click(editButton);
    await actor.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("heading", { name: "Add a subject" }),
    ).toBeInTheDocument();
    expect(editButton).toHaveFocus();
  });

  it("asks for confirmation before deleting and focuses Cancel", async () => {
    setup(asAdmin);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Delete MATH" }));

    expect(
      await screen.findByRole("region", { name: "Delete Mathematics (MATH)?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(subjectsApi.remove).not.toHaveBeenCalled();
  });

  it("returns focus to the Delete button when cancelled", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const deleteButton = await screen.findByRole("button", {
      name: "Delete MATH",
    });
    await actor.click(deleteButton);
    await actor.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("region", { name: "Delete Mathematics (MATH)?" }),
    ).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it("deletes after confirmation and keeps focus on the heading", async () => {
    subjectsApi.remove.mockResolvedValue();
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete MATH" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete subject" }),
    );

    expect(subjectsApi.remove).toHaveBeenCalledWith(1, 1);
    expect(
      await screen.findByText("Mathematics (MATH) was deleted."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "MATH" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Subjects of North" }),
    ).toHaveFocus();
  });

  it("shows an error and keeps the subject when deleting fails", async () => {
    subjectsApi.remove.mockRejectedValue({ response: { status: 403 } });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete MATH" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete subject" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
    expect(screen.getByRole("cell", { name: "MATH" })).toBeInTheDocument();
  });
});
