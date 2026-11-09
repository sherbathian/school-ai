import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import Dashboard from "./Dashboard";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../components/HealthStatus", () => ({ default: () => null }));
vi.mock("../components/SchoolSwitcher", () => ({ default: () => null }));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the school and the role at that school", () => {
    useAuth.mockReturnValue({
      user: { name: "Sam", is_super_admin: false },
      currentSchool: { name: "North", role: "teacher" },
    });
    render(<Dashboard />);

    expect(
      screen.getByRole("heading", { name: "Welcome, Sam" }),
    ).toBeInTheDocument();
    expect(screen.getByText("North · Role: teacher")).toBeInTheDocument();
  });

  it("shows super admin instead of a school role", () => {
    useAuth.mockReturnValue({
      user: { name: "Root", is_super_admin: true },
      currentSchool: null,
    });
    render(<Dashboard />);

    expect(screen.getByText("Role: super admin")).toBeInTheDocument();
  });

  it("explains when the account has no school", () => {
    useAuth.mockReturnValue({
      user: { name: "Lost", is_super_admin: false },
      currentSchool: null,
    });
    render(<Dashboard />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /isn't linked to a school/,
    );
  });
});
