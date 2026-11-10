import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { sectionsApi } from "../lib/academicApi";
import { getSchool } from "../lib/schoolsApi";
import SchoolSections from "./SchoolSections";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({ getSchool: vi.fn() }));
vi.mock("../lib/academicApi", () => ({
  sectionsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const north = { id: 1, name: "North" };
const a = { id: 1, title: "A", status: "active" };
const b = { id: 2, title: "B", status: "inactive" };
const c = { id: 3, title: "C", status: "active" };

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
const asSuper = { id: 1, is_super_admin: true, schools: [] };

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/schools/1/sections"]}>
      <Routes>
        <Route path="/schools/:id/sections" element={<SchoolSections />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setup(user, sections = [a, b]) {
  useAuth.mockReturnValue({ user });
  getSchool.mockResolvedValue(north);
  sectionsApi.list.mockResolvedValue(sections);
  renderPage();
}

describe("SchoolSections", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists the sections for a teacher, without any editing controls", async () => {
    setup(asTeacher);

    expect(
      await screen.findByRole("heading", { name: "Sections of North" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "A" })).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /section/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the add form and the row buttons to a school admin", async () => {
    setup(asAdmin);

    expect(
      await screen.findByRole("heading", { name: "Add a section" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Section" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit section A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete section A" }),
    ).toBeInTheDocument();
  });

  it("shows the same controls to a super admin", async () => {
    setup(asSuper);

    expect(
      await screen.findByRole("form", { name: "Section" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete section B" }),
    ).toBeInTheDocument();
  });

  it("says so when there are no sections", async () => {
    setup(asAdmin, []);

    expect(
      await screen.findByText("No sections yet. Add the first one below."),
    ).toBeInTheDocument();
  });

  it("shows an error when the sections can't be loaded", async () => {
    useAuth.mockReturnValue({ user: asAdmin });
    getSchool.mockRejectedValue({ response: { status: 403 } });
    sectionsApi.list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
  });

  it("adds a section, clears the form and focuses it for the next one", async () => {
    sectionsApi.create.mockResolvedValue({
      id: 4,
      title: "D",
      status: "active",
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "D");
    await actor.click(screen.getByRole("button", { name: "Add section" }));

    expect(sectionsApi.create).toHaveBeenCalledWith(1, {
      title: "D",
      status: "active",
    });
    expect(await screen.findByText("Section D was added.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "D" })).toBeInTheDocument();

    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("");
    expect(title).toHaveFocus();
  });

  it("keeps the list sorted by title", async () => {
    sectionsApi.create.mockResolvedValue({
      id: 4,
      title: "A",
      status: "active",
    });
    setup(asAdmin, [c, b]);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "A");
    await actor.click(screen.getByRole("button", { name: "Add section" }));
    await screen.findByText("Section A was added.");

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[0].textContent),
    ).toEqual(["A", "B", "C"]);
  });

  it("shows the server's message when the title is taken", async () => {
    sectionsApi.create.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { title: ["The title has already been taken."] } },
      },
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Title"), "A");
    await actor.click(screen.getByRole("button", { name: "Add section" }));

    expect(
      await screen.findByText("The title has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + A + B, unchanged
  });

  it("edits a section in the same form", async () => {
    sectionsApi.update.mockResolvedValue({
      id: 1,
      title: "Alpha",
      status: "active",
    });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Edit section A" }),
    );

    expect(
      screen.getByRole("heading", { name: "Edit section A" }),
    ).toBeInTheDocument();
    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("A");
    expect(title).toHaveFocus();

    await actor.clear(title);
    await actor.type(title, "Alpha");
    await actor.click(screen.getByRole("button", { name: "Save changes" }));

    expect(sectionsApi.update).toHaveBeenCalledWith(1, 1, {
      title: "Alpha",
      status: "active",
    });
    expect(
      await screen.findByText("Section Alpha was saved."),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Alpha" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Add a section" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sections of North" }),
    ).toHaveFocus();
  });

  it("cancels editing and returns focus to the Edit button", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const editButton = await screen.findByRole("button", {
      name: "Edit section A",
    });
    await actor.click(editButton);
    await actor.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("heading", { name: "Add a section" }),
    ).toBeInTheDocument();
    expect(editButton).toHaveFocus();
  });

  it("asks for confirmation before deleting and focuses Cancel", async () => {
    setup(asAdmin);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Delete section A" }));

    expect(
      await screen.findByRole("region", { name: "Delete section A?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(sectionsApi.remove).not.toHaveBeenCalled();
  });

  it("returns focus to the Delete button when cancelled", async () => {
    setup(asAdmin);
    const actor = userEvent.setup();

    const deleteButton = await screen.findByRole("button", {
      name: "Delete section A",
    });
    await actor.click(deleteButton);
    await actor.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("region", { name: "Delete section A?" }),
    ).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it("deletes after confirmation and keeps focus on the heading", async () => {
    sectionsApi.remove.mockResolvedValue();
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete section A" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete section" }),
    );

    expect(sectionsApi.remove).toHaveBeenCalledWith(1, 1);
    expect(
      await screen.findByText("Section A was deleted."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "A" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sections of North" }),
    ).toHaveFocus();
  });

  it("shows an error and keeps the section when deleting fails", async () => {
    sectionsApi.remove.mockRejectedValue({ response: { status: 403 } });
    setup(asAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete section A" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete section" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
    expect(screen.getByRole("cell", { name: "A" })).toBeInTheDocument();
  });
});
