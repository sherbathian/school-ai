import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { listSchools } from "../lib/schoolsApi";
import SchoolList from "./SchoolList";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/schoolsApi", () => ({ listSchools: vi.fn() }));

const north = {
  id: 1,
  name: "North",
  slug: "north",
  status: "active",
  phone: "0300 1234567",
  email: "office@north.example",
};
const south = {
  id: 2,
  name: "South",
  slug: "south",
  status: "inactive",
  phone: null,
  email: null,
};

describe("SchoolList", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuth.mockReturnValue({ user: { is_super_admin: false, schools: [] } });
  });

  it("shows a loading message first", () => {
    listSchools.mockReturnValue(new Promise(() => {}));
    render(<SchoolList />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading schools");
  });

  it("lists the schools with their status and contact details", async () => {
    listSchools.mockResolvedValue([north, south]);
    render(<SchoolList />);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(screen.getByText("North")).toBeInTheDocument();
    expect(screen.getByText("0300 1234567")).toBeInTheDocument();
    expect(screen.getByText("office@north.example")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("tells a super admin when there are no schools", async () => {
    useAuth.mockReturnValue({ user: { is_super_admin: true, schools: [] } });
    listSchools.mockResolvedValue([]);
    render(<SchoolList />);

    expect(await screen.findByText("No schools yet.")).toBeInTheDocument();
  });

  it("tells other users their account is not linked to a school", async () => {
    listSchools.mockResolvedValue([]);
    render(<SchoolList />);

    expect(
      await screen.findByText(/isn't linked to a school/),
    ).toBeInTheDocument();
  });

  it("shows an error and lets the user try again", async () => {
    listSchools
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce([north]);
    render(<SchoolList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn't load the schools",
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("North")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
