import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { getSchool } from "../lib/schoolsApi";
import SchoolHome from "./SchoolHome";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({ getSchool: vi.fn() }));

const north = { id: 1, name: "North" };
const asAdmin = { is_super_admin: false, schools: [{ id: 1, role: "admin" }] };
const asTeacher = {
  is_super_admin: false,
  schools: [{ id: 1, role: "teacher" }],
};

function renderHome(user) {
  useAuth.mockReturnValue({ user });

  render(
    <MemoryRouter initialEntries={["/schools/1"]}>
      <Routes>
        <Route path="/schools/:id" element={<SchoolHome />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SchoolHome", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows a loading message first", () => {
    getSchool.mockReturnValue(new Promise(() => {}));
    renderHome(asTeacher);

    expect(screen.getByRole("status")).toHaveTextContent("Loading school");
  });

  it("shows the school with its academic links to a teacher, without admin links", async () => {
    getSchool.mockResolvedValue(north);
    renderHome(asTeacher);

    expect(
      await screen.findByRole("heading", { name: "North" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sections" })).toHaveAttribute(
      "href",
      "/schools/1/sections",
    );
    expect(screen.getByRole("link", { name: "Grades" })).toHaveAttribute(
      "href",
      "/schools/1/grades",
    );
    expect(screen.getByRole("link", { name: "Subjects" })).toHaveAttribute(
      "href",
      "/schools/1/subjects",
    );
    expect(
      screen.queryByRole("link", { name: "Members" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "School details" }),
    ).not.toBeInTheDocument();
  });

  it("also shows Members and School details to a school admin", async () => {
    getSchool.mockResolvedValue(north);
    renderHome(asAdmin);

    expect(
      await screen.findByRole("link", { name: "Members" }),
    ).toHaveAttribute("href", "/schools/1/members");
    expect(
      screen.getByRole("link", { name: "School details" }),
    ).toHaveAttribute("href", "/schools/1/edit");
  });

  it("shows an error when the school can't be loaded", async () => {
    getSchool.mockRejectedValue({ response: { status: 403 } });
    renderHome(asTeacher);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
  });
});
