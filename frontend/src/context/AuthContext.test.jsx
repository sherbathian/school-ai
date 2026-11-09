import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api, { setUnauthorizedHandler } from "../api";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  setUnauthorizedHandler: vi.fn(),
}));

const twoSchoolUser = {
  id: 1,
  name: "Sam",
  email: "sam@school.test",
  is_super_admin: false,
  schools: [
    { id: 1, name: "North", slug: "north", role: "teacher" },
    { id: 2, name: "South", slug: "south", role: "admin" },
  ],
};

// A tiny component that shows what the provider gives to its children.
function Probe() {
  const auth = useAuth();
  if (auth.loading) return <p>loading</p>;

  return (
    <div>
      <p data-testid="user">{auth.user ? auth.user.email : "nobody"}</p>
      <p data-testid="school">
        {auth.currentSchool ? auth.currentSchool.slug : "none"}
      </p>
      <p data-testid="admin">{String(auth.hasRole(["admin"]))}</p>
      <button onClick={() => auth.login("sam@school.test", "pw")}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
      <button onClick={() => auth.selectSchool(2)}>pick south</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("starts logged out when there is no saved token", async () => {
    renderProbe();

    expect(await screen.findByTestId("user")).toHaveTextContent("nobody");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("restores the session from a saved token", async () => {
    localStorage.setItem("token", "saved");
    api.get.mockResolvedValue({ data: twoSchoolUser });
    renderProbe();

    expect(await screen.findByText("sam@school.test")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/me");
  });

  it("drops a saved token the server rejects", async () => {
    localStorage.setItem("token", "stale");
    api.get.mockRejectedValue({ response: { status: 401 } });
    renderProbe();

    expect(await screen.findByTestId("user")).toHaveTextContent("nobody");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("stores the token and user on login", async () => {
    api.post.mockResolvedValue({
      data: { token: "new-token", user: twoSchoolUser },
    });
    renderProbe();
    const actor = userEvent.setup();

    await actor.click(await screen.findByRole("button", { name: "login" }));

    expect(await screen.findByText("sam@school.test")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(api.post).toHaveBeenCalledWith("/login", {
      email: "sam@school.test",
      password: "pw",
    });
  });

  it("defaults to the first school and reads the role from the chosen one", async () => {
    localStorage.setItem("token", "saved");
    api.get.mockResolvedValue({ data: twoSchoolUser });
    renderProbe();
    const actor = userEvent.setup();

    expect(await screen.findByTestId("school")).toHaveTextContent("north");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");

    await actor.click(screen.getByRole("button", { name: "pick south" }));

    expect(screen.getByTestId("school")).toHaveTextContent("south");
    expect(screen.getByTestId("admin")).toHaveTextContent("true");
    expect(localStorage.getItem("schoolId")).toBe("2");
  });

  it("treats a super admin as having every role", async () => {
    localStorage.setItem("token", "saved");
    api.get.mockResolvedValue({
      data: { ...twoSchoolUser, is_super_admin: true, schools: [] },
    });
    renderProbe();

    expect(await screen.findByTestId("school")).toHaveTextContent("none");
    expect(screen.getByTestId("admin")).toHaveTextContent("true");
  });

  it("clears the session on logout", async () => {
    localStorage.setItem("token", "saved");
    api.get.mockResolvedValue({ data: twoSchoolUser });
    api.post.mockResolvedValue({});
    renderProbe();
    const actor = userEvent.setup();

    await screen.findByText("sam@school.test");
    await actor.click(screen.getByRole("button", { name: "logout" }));

    expect(await screen.findByText("nobody")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("ends the session when the API reports an expired token", async () => {
    localStorage.setItem("token", "saved");
    api.get.mockResolvedValue({ data: twoSchoolUser });
    renderProbe();

    await screen.findByText("sam@school.test");

    // The provider registered its handler with the api module; call it
    // the way the interceptor would after a 401.
    const handler = setUnauthorizedHandler.mock.calls[0][0];
    act(() => handler());

    expect(await screen.findByText("nobody")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
