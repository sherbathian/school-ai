import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AddMemberForm from "./AddMemberForm";

function setup(onSubmit = vi.fn().mockResolvedValue()) {
  render(<AddMemberForm onSubmit={onSubmit} />);
  return { onSubmit, actor: userEvent.setup() };
}

async function fill(actor) {
  await actor.type(screen.getByLabelText("Name"), "Sara Ahmed");
  await actor.type(screen.getByLabelText("Email"), "sara@school.test");
  await actor.type(
    screen.getByLabelText("Initial password"),
    "a-long-password",
  );
}

describe("AddMemberForm", () => {
  it("shows labelled fields with Teacher as the default role", () => {
    setup();

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Initial password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Role")).toHaveValue("teacher");
  });

  it("submits what was typed", async () => {
    const { onSubmit, actor } = setup();

    await fill(actor);
    await actor.click(screen.getByRole("button", { name: "Add person" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Sara Ahmed",
      email: "sara@school.test",
      password: "a-long-password",
      role: "teacher",
    });
  });

  it("lets the person be added as an admin", async () => {
    const { onSubmit, actor } = setup();

    await fill(actor);
    await actor.selectOptions(screen.getByLabelText("Role"), "admin");
    await actor.click(screen.getByRole("button", { name: "Add person" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin" }),
    );
  });

  it("shows validation errors next to their fields", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { email: ["The email has already been taken."] } },
      },
    });
    const { actor } = setup(onSubmit);

    await actor.click(screen.getByRole("button", { name: "Add person" }));

    expect(
      await screen.findByText("The email has already been taken."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "The email has already been taken.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please fix the highlighted fields.",
    );
  });

  it("shows a general message for other errors", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { status: 403 } });
    const { actor } = setup(onSubmit);

    await actor.click(screen.getByRole("button", { name: "Add person" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission",
    );
  });

  it("disables the button while adding", async () => {
    const onSubmit = vi.fn().mockReturnValue(new Promise(() => {})); // never finishes
    const { actor } = setup(onSubmit);

    await actor.click(screen.getByRole("button", { name: "Add person" }));

    expect(
      await screen.findByRole("button", { name: "Adding…" }),
    ).toBeDisabled();
  });
});
