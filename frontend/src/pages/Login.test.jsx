import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import Login from "./Login";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));

function renderLogin(login) {
  useAuth.mockReturnValue({ login });

  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit() {
  const actor = userEvent.setup();
  await actor.type(screen.getByLabelText("Email"), "sam@school.test");
  await actor.type(screen.getByLabelText("Password"), "secret");
  await actor.click(screen.getByRole("button", { name: /login|signing in/i }));
}

describe("Login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("connects each label to its field", () => {
    renderLogin(vi.fn());

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("submits the credentials and goes to the home page", async () => {
    const login = vi.fn().mockResolvedValue();
    renderLogin(login);

    await fillAndSubmit();

    expect(login).toHaveBeenCalledWith("sam@school.test", "secret");
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("shows the API's message when the credentials are wrong", async () => {
    const login = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { email: ["Email or password is wrong."] } },
      },
    });
    renderLogin(login);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is wrong.",
    );
    expect(
      screen.getByRole("heading", { name: "School Login" }),
    ).toBeInTheDocument();
  });

  it("shows a friendly message when throttled", async () => {
    const login = vi.fn().mockRejectedValue({
      response: { status: 429, data: { message: "Too Many Attempts." } },
    });
    renderLogin(login);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts",
    );
  });

  it("falls back to a generic message when the API is unreachable", async () => {
    const login = vi.fn().mockRejectedValue(new Error("Network Error"));
    renderLogin(login);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Login failed");
  });

  it("disables the button while signing in", async () => {
    const login = vi.fn().mockReturnValue(new Promise(() => {})); // never finishes
    renderLogin(login);

    await fillAndSubmit();

    expect(
      await screen.findByRole("button", { name: "Signing in…" }),
    ).toBeDisabled();
  });
});
