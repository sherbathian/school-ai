import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import Layout from "./Layout";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));

function renderAt(path, logout = vi.fn()) {
  useAuth.mockReturnValue({ user: { name: "Sam" }, logout });

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>Dashboard page</p>} />
          <Route path="/schools" element={<p>Schools page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  return logout;
}

describe("Layout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the main links and the user's name", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schools" })).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("marks the current page", () => {
    renderAt("/schools");

    expect(screen.getByRole("link", { name: "Schools" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("shows the page inside the layout", () => {
    renderAt("/");

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("logs out when the button is clicked", async () => {
    const logout = renderAt("/");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Logout" }));

    expect(logout).toHaveBeenCalledOnce();
  });
});
