import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import {
  addMember,
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
  changeMemberRole: vi.fn(),
  removeMember: vi.fn(),
}));
vi.mock("../lib/schoolsApi", () => ({ getSchool: vi.fn() }));

const north = { id: 1, name: "North" };
const ana = {
  id: 10,
  name: "Ana Admin",
  email: "ana@school.test",
  role: "admin",
};
const bea = {
  id: 12,
  name: "Bea Admin",
  email: "bea@school.test",
  role: "admin",
};
const tom = {
  id: 11,
  name: "Tom Teacher",
  email: "tom@school.test",
  role: "teacher",
};

const asAna = {
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

function renderMembers(user, id = 1) {
  const refreshUser = vi.fn().mockResolvedValue();
  useAuth.mockReturnValue({ user, refreshUser });

  render(
    <MemoryRouter initialEntries={[`/schools/${id}/members`]}>
      <Routes>
        <Route path="/schools/:id/members" element={<SchoolMembers />} />
      </Routes>
    </MemoryRouter>,
  );

  return { refreshUser };
}

function loaded(members = [ana, tom]) {
  getSchool.mockResolvedValue(north);
  listMembers.mockResolvedValue(members);
}

describe("SchoolMembers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies access to a teacher without loading anything", () => {
    renderMembers(asTeacher);

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied.");
    expect(listMembers).not.toHaveBeenCalled();
  });

  it("denies an admin access to another school's members", () => {
    renderMembers(asAna, 2);

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied.");
    expect(listMembers).not.toHaveBeenCalled();
  });

  it("lists the members with their roles and marks the current user", async () => {
    loaded();
    renderMembers(asAna);

    expect(
      await screen.findByRole("heading", { name: "Members of North" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ana Admin (you)")).toBeInTheDocument();
    expect(screen.getByText("tom@school.test")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Role for Ana Admin" }),
    ).toHaveValue("admin");
    expect(
      screen.getByRole("combobox", { name: "Role for Tom Teacher" }),
    ).toHaveValue("teacher");
  });

  it("says so when the school has no members yet", async () => {
    loaded([]);
    renderMembers(asSuper);

    expect(await screen.findByText(/No members yet/)).toBeInTheDocument();
  });

  it("shows an error when the members can't be loaded", async () => {
    getSchool.mockRejectedValue({ response: { status: 403 } });
    listMembers.mockResolvedValue([]);
    renderMembers(asAna);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
  });

  it("changes a member's role", async () => {
    loaded();
    changeMemberRole.mockResolvedValue({ ...tom, role: "admin" });
    renderMembers(asAna);

    const select = await screen.findByRole("combobox", {
      name: "Role for Tom Teacher",
    });
    await userEvent.setup().selectOptions(select, "admin");

    expect(changeMemberRole).toHaveBeenCalledWith(1, 11, "admin");
    expect(
      await screen.findByText("Tom Teacher is now an admin."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Role for Tom Teacher" }),
    ).toHaveValue("admin");
  });

  it("shows the server's message and keeps the old role when a change is refused", async () => {
    loaded([ana]);
    changeMemberRole.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { role: ["A school must keep at least one admin."] } },
      },
    });
    renderMembers(asAna);

    const select = await screen.findByRole("combobox", {
      name: "Role for Ana Admin",
    });
    await userEvent.setup().selectOptions(select, "teacher");

    expect(
      await screen.findByText("A school must keep at least one admin."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Role for Ana Admin" }),
    ).toHaveValue("admin");
  });

  it("reloads the user after they change their own role", async () => {
    loaded([ana, bea]);
    changeMemberRole.mockResolvedValue({ ...ana, role: "teacher" });
    const { refreshUser } = renderMembers(asAna);

    const select = await screen.findByRole("combobox", {
      name: "Role for Ana Admin",
    });
    await userEvent.setup().selectOptions(select, "teacher");

    expect(
      await screen.findByText("Ana Admin is now a teacher."),
    ).toBeInTheDocument();
    expect(refreshUser).toHaveBeenCalled();
  });

  it("adds a person, shows them in the list and clears the form", async () => {
    loaded([ana]);
    addMember.mockResolvedValue({
      id: 20,
      name: "Sara Ahmed",
      email: "sara@school.test",
      role: "teacher",
    });
    renderMembers(asAna);
    const actor = userEvent.setup();

    await actor.type(await screen.findByLabelText("Name"), "Sara Ahmed");
    await actor.type(screen.getByLabelText("Email"), "sara@school.test");
    await actor.type(
      screen.getByLabelText("Initial password"),
      "a-long-password",
    );
    await actor.click(screen.getByRole("button", { name: "Add person" }));

    expect(addMember).toHaveBeenCalledWith(1, {
      name: "Sara Ahmed",
      email: "sara@school.test",
      password: "a-long-password",
      role: "teacher",
    });
    expect(
      await screen.findByText("Sara Ahmed was added."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Sara Ahmed" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("asks for confirmation before removing and focuses Cancel", async () => {
    loaded();
    renderMembers(asAna);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Remove Tom Teacher" }));

    expect(
      await screen.findByRole("heading", { name: "Remove Tom Teacher?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(removeMember).not.toHaveBeenCalled();
  });

  it("returns focus to the Remove button when cancelled", async () => {
    loaded();
    renderMembers(asAna);
    const actor = userEvent.setup();

    const removeButton = await screen.findByRole("button", {
      name: "Remove Tom Teacher",
    });
    await actor.click(removeButton);
    await actor.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("heading", { name: "Remove Tom Teacher?" }),
    ).not.toBeInTheDocument();
    expect(removeButton).toHaveFocus();
  });

  it("removes a member after confirmation and keeps focus on the heading", async () => {
    loaded();
    removeMember.mockResolvedValue();
    renderMembers(asAna);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Remove Tom Teacher" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, remove" }),
    );

    expect(removeMember).toHaveBeenCalledWith(1, 11);
    expect(
      await screen.findByText("Tom Teacher was removed."),
    ).toBeInTheDocument();
    expect(screen.queryByText("tom@school.test")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Members of North" }),
    ).toHaveFocus();
  });

  it("shows the server's message when a removal is refused", async () => {
    loaded([ana]);
    removeMember.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { user: ["A school must keep at least one admin."] } },
      },
    });
    renderMembers(asAna);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Remove Ana Admin" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, remove" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A school must keep at least one admin.",
    );
    expect(screen.getByText("ana@school.test")).toBeInTheDocument();
  });
});
