import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { deleteSchool, getSchool, updateSchool } from "../lib/schoolsApi";
import SchoolEdit from "./SchoolEdit";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({
  getSchool: vi.fn(),
  updateSchool: vi.fn(),
  deleteSchool: vi.fn(),
}));

const north = {
  id: 1,
  name: "North",
  slug: "north",
  status: "active",
  url: null,
  phone: "123",
  email: null,
  address: null,
  about: null,
};

const schoolAdmin = {
  is_super_admin: false,
  schools: [{ id: 1, role: "admin" }],
};
const teacher = {
  is_super_admin: false,
  schools: [{ id: 1, role: "teacher" }],
};
const superAdmin = { is_super_admin: true, schools: [] };

function ListProbe() {
  const { state } = useLocation();
  return <p>List page: {state?.notice}</p>;
}

function renderEdit(user, id = 1) {
  const refreshUser = vi.fn().mockResolvedValue();
  useAuth.mockReturnValue({ user, refreshUser });

  render(
    <MemoryRouter initialEntries={[`/schools/${id}/edit`]}>
      <Routes>
        <Route path="/schools/:id/edit" element={<SchoolEdit />} />
        <Route path="/schools" element={<ListProbe />} />
      </Routes>
    </MemoryRouter>,
  );

  return { refreshUser };
}

describe("SchoolEdit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies access to a teacher without loading the school", () => {
    renderEdit(teacher);

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied.");
    expect(getSchool).not.toHaveBeenCalled();
  });

  it("denies an admin access to another school", () => {
    renderEdit(schoolAdmin, 2);

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied.");
    expect(getSchool).not.toHaveBeenCalled();
  });

  it("loads the school into the form for its admin, without status or delete", async () => {
    getSchool.mockResolvedValue(north);
    renderEdit(schoolAdmin);

    expect(await screen.findByLabelText("Name")).toHaveValue("North");
    expect(screen.getByLabelText("Phone")).toHaveValue("123");
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete school" }),
    ).not.toBeInTheDocument();
  });

  it("saves the changes, refreshes the user and returns to the list", async () => {
    getSchool.mockResolvedValue(north);
    updateSchool.mockResolvedValue(north);
    const { refreshUser } = renderEdit(schoolAdmin);
    const actor = userEvent.setup();

    const name = await screen.findByLabelText("Name");
    await actor.clear(name);
    await actor.type(name, "North Campus");
    await actor.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateSchool).toHaveBeenCalledWith(1, {
      name: "North Campus",
      url: "",
      phone: "123",
      email: "",
      address: "",
      about: "",
    });
    expect(refreshUser).toHaveBeenCalled();
    expect(
      await screen.findByText("List page: School saved."),
    ).toBeInTheDocument();
  });

  it("shows the server's validation errors without leaving the page", async () => {
    getSchool.mockResolvedValue(north);
    updateSchool.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { name: ["The name field is required."] } },
      },
    });
    renderEdit(schoolAdmin);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("The name field is required."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "Edit school" }),
    ).toBeInTheDocument();
  });

  it("shows the status field and the delete section to a super admin", async () => {
    getSchool.mockResolvedValue(north);
    renderEdit(superAdmin);

    expect(await screen.findByLabelText("Status")).toHaveValue("active");
    expect(
      screen.getByRole("button", { name: "Delete school" }),
    ).toBeInTheDocument();
  });

  it("sends the status when a super admin changes it", async () => {
    getSchool.mockResolvedValue(north);
    updateSchool.mockResolvedValue(north);
    renderEdit(superAdmin);
    const actor = userEvent.setup();

    await actor.selectOptions(
      await screen.findByLabelText("Status"),
      "inactive",
    );
    await actor.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateSchool).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "inactive" }),
    );
  });

  it("explains when the school can't be loaded", async () => {
    getSchool.mockRejectedValue({ response: { status: 404 } });
    renderEdit(superAdmin);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That item no longer exists.",
    );
  });

  it("asks for confirmation before deleting and focuses Cancel", async () => {
    getSchool.mockResolvedValue(north);
    renderEdit(superAdmin);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Delete school" }));

    expect(
      await screen.findByRole("heading", { name: "Delete North?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(deleteSchool).not.toHaveBeenCalled();
  });

  it("returns focus to the delete button when cancelled", async () => {
    getSchool.mockResolvedValue(north);
    renderEdit(superAdmin);
    const actor = userEvent.setup();

    const deleteButton = await screen.findByRole("button", {
      name: "Delete school",
    });
    await actor.click(deleteButton);
    await actor.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("heading", { name: "Delete North?" }),
    ).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it("deletes the school after confirmation and returns to the list", async () => {
    getSchool.mockResolvedValue(north);
    deleteSchool.mockResolvedValue();
    renderEdit(superAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete school" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete school" }),
    );

    expect(deleteSchool).toHaveBeenCalledWith(1);
    expect(
      await screen.findByText("List page: School deleted."),
    ).toBeInTheDocument();
  });

  it("shows an error and stays on the page when deleting fails", async () => {
    getSchool.mockResolvedValue(north);
    deleteSchool.mockRejectedValue({ response: { status: 403 } });
    renderEdit(superAdmin);
    const actor = userEvent.setup();

    await actor.click(
      await screen.findByRole("button", { name: "Delete school" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "Yes, delete school" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission to do that.",
    );
    expect(
      screen.getByRole("heading", { name: "Edit school" }),
    ).toBeInTheDocument();
  });
});
