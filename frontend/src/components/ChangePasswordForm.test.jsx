import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChangePasswordForm from "./ChangePasswordForm";

function setup(onSubmit = vi.fn().mockResolvedValue()) {
  render(<ChangePasswordForm onSubmit={onSubmit} />);
  return { onSubmit, actor: userEvent.setup() };
}

async function fill(actor) {
  await actor.type(
    screen.getByLabelText("Current password"),
    "old-passphrase-1",
  );
  await actor.type(screen.getByLabelText("New password"), "new-passphrase-22");
  await actor.type(
    screen.getByLabelText("Confirm new password"),
    "new-passphrase-22",
  );
}

describe("ChangePasswordForm", () => {
  it("has three password fields with the right autocomplete hints", () => {
    setup();

    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("explains the length rule and the sign-out in the new password hint", () => {
    setup();

    expect(screen.getByLabelText("New password")).toHaveAccessibleDescription(
      expect.stringContaining("At least 10 characters"),
    );
  });

  it("submits the three values using the API's field names", async () => {
    const { onSubmit, actor } = setup();

    await fill(actor);
    await actor.click(screen.getByRole("button", { name: "Change password" }));

    expect(onSubmit).toHaveBeenCalledWith({
      current_password: "old-passphrase-1",
      password: "new-passphrase-22",
      password_confirmation: "new-passphrase-22",
    });
  });

  it("shows validation errors next to their fields", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: {
          errors: { current_password: ["The current password is incorrect."] },
        },
      },
    });
    const { actor } = setup(onSubmit);

    await actor.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByText("The current password is incorrect."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByLabelText("Current password"),
    ).toHaveAccessibleDescription("The current password is incorrect.");
  });

  it("disables the button while changing", async () => {
    const onSubmit = vi.fn().mockReturnValue(new Promise(() => {})); // never finishes
    const { actor } = setup(onSubmit);

    await actor.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByRole("button", { name: "Changing…" }),
    ).toBeDisabled();
  });
});
