import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import ProtectedRoute from "./ProtectedRoute";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));

function renderAt(roles) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute roles={roles}>
              <p>Secret page</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows a loading message while the session is checked", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: true,
      hasRole: () => false,
    });
    renderAt();

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("sends guests to the login page", () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      hasRole: () => false,
    });
    renderAt();

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("shows the page to a logged-in user when no roles are required", () => {
    useAuth.mockReturnValue({
      user: { id: 1 },
      loading: false,
      hasRole: () => false,
    });
    renderAt();

    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  it("shows 'Access denied' when the role does not match", () => {
    useAuth.mockReturnValue({
      user: { id: 1 },
      loading: false,
      hasRole: () => false,
    });
    renderAt(["admin"]);

    expect(screen.getByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("shows the page when the role matches", () => {
    useAuth.mockReturnValue({
      user: { id: 1 },
      loading: false,
      hasRole: () => true,
    });
    renderAt(["admin"]);

    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  it("asks hasRole with the roles the route requires", () => {
    const hasRole = vi.fn().mockReturnValue(true);
    useAuth.mockReturnValue({ user: { id: 1 }, loading: false, hasRole });
    renderAt(["admin"]);

    expect(hasRole).toHaveBeenCalledWith(["admin"]);
  });
});
