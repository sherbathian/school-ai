import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changePassword } from "../lib/accountApi";
import ChangePassword from "./ChangePassword";

vi.mock("../lib/accountApi", () => ({ changePassword: vi.fn() }));

async function fillAndSubmit() {
  const actor = userEvent.setup();
  await actor.type(
    screen.getByLabelText("Current password"),
    "old-passphrase-1",
  );
  await actor.type(screen.getByLabelText("New password"), "new-passphrase-22");
  await actor.type(
    screen.getByLabelText("Confirm new password"),
    "new-passphrase-22",
  );
  await actor.click(screen.getByRole("button", { name: "Change password" }));
}

describe("ChangePassword", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("changes the password, shows a notice and clears the form", async () => {
    changePassword.mockResolvedValue();
    render(<ChangePassword />);

    await fillAndSubmit();

    expect(changePassword).toHaveBeenCalledWith({
      current_password: "old-passphrase-1",
      password: "new-passphrase-22",
      password_confirmation: "new-passphrase-22",
    });
    expect(
      await screen.findByText(/Your password was changed/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it("shows the server's message when the current password is wrong", async () => {
    changePassword.mockRejectedValue({
      response: {
        status: 422,
        data: {
          errors: { current_password: ["The current password is incorrect."] },
        },
      },
    });
    render(<ChangePassword />);

    await fillAndSubmit();

    expect(
      await screen.findByText("The current password is incorrect."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.queryByText(/Your password was changed/),
    ).not.toBeInTheDocument();
  });

  it("tells the person when they are being throttled", async () => {
    changePassword.mockRejectedValue({ response: { status: 429 } });
    render(<ChangePassword />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts",
    );
  });
});
