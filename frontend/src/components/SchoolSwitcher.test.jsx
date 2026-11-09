import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import SchoolSwitcher from "./SchoolSwitcher";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));

const north = { id: 1, name: "North", slug: "north", role: "teacher" };
const south = { id: 2, name: "South", slug: "south", role: "admin" };

describe("SchoolSwitcher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders nothing for a user with no schools", () => {
    useAuth.mockReturnValue({
      schools: [],
      currentSchool: null,
      selectSchool: vi.fn(),
    });
    const { container } = render(<SchoolSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is only one school", () => {
    useAuth.mockReturnValue({
      schools: [north],
      currentSchool: north,
      selectSchool: vi.fn(),
    });
    const { container } = render(<SchoolSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });

  it("lists the schools and selects the current one", () => {
    useAuth.mockReturnValue({
      schools: [north, south],
      currentSchool: south,
      selectSchool: vi.fn(),
    });
    render(<SchoolSwitcher />);

    expect(screen.getByLabelText("School")).toHaveValue("2");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("tells the provider which school was chosen, as a number", async () => {
    const selectSchool = vi.fn();
    useAuth.mockReturnValue({
      schools: [north, south],
      currentSchool: north,
      selectSchool,
    });
    render(<SchoolSwitcher />);

    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText("School"), "South");

    expect(selectSchool).toHaveBeenCalledWith(2);
  });
});
