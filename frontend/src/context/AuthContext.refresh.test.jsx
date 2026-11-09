import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  setUnauthorizedHandler: vi.fn(),
}));

const userWith = (schoolName) => ({
  id: 1,
  name: "Sam",
  is_super_admin: false,
  schools: [{ id: 1, name: schoolName, slug: "north", role: "admin" }],
});

function Probe() {
  const { user, loading, refreshUser } = useAuth();
  if (loading) return <p>loading</p>;

  return (
    <div>
      <p>{user.schools[0].name}</p>
      <button onClick={() => refreshUser()}>refresh</button>
    </div>
  );
}

describe("AuthProvider.refreshUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("reloads the user and their schools from the server", async () => {
    localStorage.setItem("token", "saved");
    api.get
      .mockResolvedValueOnce({ data: userWith("North") })
      .mockResolvedValueOnce({ data: userWith("North Campus") });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText("North")).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "refresh" }));

    expect(await screen.findByText("North Campus")).toBeInTheDocument();
  });
});
