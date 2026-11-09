import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { createSchool } from "../lib/schoolsApi";
import SchoolCreate from "./SchoolCreate";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({ createSchool: vi.fn() }));

function ListProbe() {
  const { state } = useLocation();
  return <p>List page: {state?.notice}</p>;
}

function renderCreate(user) {
  useAuth.mockReturnValue({ user });

  render(
    <MemoryRouter initialEntries={["/schools/new"]}>
      <Routes>
        <Route path="/schools/new" element={<SchoolCreate />} />
        <Route path="/schools" element={<ListProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SchoolCreate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies access to anyone but a super admin", () => {
    renderCreate({
      is_super_admin: false,
      schools: [{ id: 1, role: "admin" }],
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied.");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("creates the school and returns to the list with a notice", async () => {
    createSchool.mockResolvedValue({ id: 5 });
    renderCreate({ is_super_admin: true, schools: [] });
    const actor = userEvent.setup();

    await actor.type(screen.getByLabelText("Name"), "Green Valley");
    await actor.click(screen.getByRole("button", { name: "Create school" }));

    expect(createSchool).toHaveBeenCalledWith({
      name: "Green Valley",
      url: "",
      phone: "",
      email: "",
      address: "",
      about: "",
      status: "active",
    });
    expect(
      await screen.findByText("List page: School created."),
    ).toBeInTheDocument();
  });

  it("shows the server's validation errors without leaving the page", async () => {
    createSchool.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { name: ["The name field is required."] } },
      },
    });
    renderCreate({ is_super_admin: true, schools: [] });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Create school" }));

    expect(
      await screen.findByText("The name field is required."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "New school" }),
    ).toBeInTheDocument();
  });
});
