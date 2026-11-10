import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import {
  addMember,
  attachMember,
  changeMemberRole,
  listMembers,
  removeMember,
} from "../lib/membersApi";
import { getSchool } from "../lib/schoolsApi";
import SchoolMembers from "./SchoolMembers";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/membersApi", () => ({
  listMembers: vi.fn(),
  addMember: vi.fn(),
  attachMember: vi.fn(),
  changeMemberRole: vi.fn(),
  removeMember: vi.fn(),
}));
vi.mock("../lib/schoolsApi", () => ({ getSchool: vi.fn() }));

// Referenced so the mocked functions are clearly part of the page's imports.
void [addMember, changeMemberRole, removeMember];

const north = { id: 1, name: "North" };
const asAdmin = {
  id: 10,
  is_super_admin: false,
  schools: [{ id: 1, role: "admin" }],
};
const asSuper = { id: 1, is_super_admin: true, schools: [] };

function renderMembers(user) {
  useAuth.mockReturnValue({ user, refreshUser: vi.fn().mockResolvedValue() });

  render(
    <MemoryRouter initialEntries={["/schools/1/members"]}>
      <Routes>
        <Route path="/schools/:id/members" element={<SchoolMembers />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SchoolMembers: existing accounts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSchool.mockResolvedValue(north);
    listMembers.mockResolvedValue([]);
  });

  it("offers the existing-account form to super admins", async () => {
    renderMembers(asSuper);

    expect(
      await screen.findByRole("form", { name: "Add an existing account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Add a person" }),
    ).toBeInTheDocument();
  });

  it("does not offer it to school admins", async () => {
    renderMembers(asAdmin);

    await screen.findByRole("form", { name: "Add a person" });
    expect(
      screen.queryByRole("form", { name: "Add an existing account" }),
    ).not.toBeInTheDocument();
  });

  it("adds an existing account from another school", async () => {
    attachMember.mockResolvedValue({
      id: 30,
      name: "Zed Visitor",
      email: "zed@school.test",
      role: "teacher",
    });
    renderMembers(asSuper);
    const actor = userEvent.setup();

    const form = await screen.findByRole("form", {
      name: "Add an existing account",
    });
    await actor.type(within(form).getByLabelText("Email"), "zed@school.test");
    await actor.click(
      within(form).getByRole("button", { name: "Add existing account" }),
    );

    expect(attachMember).toHaveBeenCalledWith(1, {
      email: "zed@school.test",
      role: "teacher",
    });
    expect(
      await screen.findByText("Zed Visitor was added."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Zed Visitor" }),
    ).toBeInTheDocument();

    const freshForm = screen.getByRole("form", {
      name: "Add an existing account",
    });
    expect(within(freshForm).getByLabelText("Email")).toHaveValue("");
  });
});
