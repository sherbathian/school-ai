import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AttachMemberForm from "./AttachMemberForm";

function setup(onSubmit = vi.fn().mockResolvedValue()) {
  render(<AttachMemberForm onSubmit={onSubmit} />);
  return { onSubmit, actor: userEvent.setup() };
}

describe("AttachMemberForm", () => {
  it("is a named form with an email field and Teacher as the default role", () => {
    setup();

    expect(
      screen.getByRole("form", { name: "Add an existing account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Role")).toHaveValue("teacher");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      /already have an account/,
    );
  });

  it("submits the email and role", async () => {
    const { onSubmit, actor } = setup();

    await actor.type(screen.getByLabelText("Email"), "zed@school.test");
    await actor.click(
      screen.getByRole("button", { name: "Add existing account" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      email: "zed@school.test",
      role: "teacher",
    });
  });

  it("lets the account be added as an admin", async () => {
    const { onSubmit, actor } = setup();

    await actor.type(screen.getByLabelText("Email"), "zed@school.test");
    await actor.selectOptions(screen.getByLabelText("Role"), "admin");
    await actor.click(
      screen.getByRole("button", { name: "Add existing account" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      email: "zed@school.test",
      role: "admin",
    });
  });

  it("shows validation errors next to the field", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: {
          errors: { email: ["This person is already a member of the school."] },
        },
      },
    });
    const { actor } = setup(onSubmit);

    await actor.click(
      screen.getByRole("button", { name: "Add existing account" }),
    );

    expect(
      await screen.findByText("This person is already a member of the school."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please fix the highlighted fields.",
    );
  });

  it("shows a general message for other errors", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { status: 403 } });
    const { actor } = setup(onSubmit);

    await actor.click(
      screen.getByRole("button", { name: "Add existing account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission",
    );
  });
});
