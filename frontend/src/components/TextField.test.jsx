import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TextField from "./TextField";

describe("TextField", () => {
  it("connects the label to the input", () => {
    render(<TextField label="Name" defaultValue="North" />);

    expect(screen.getByLabelText("Name")).toHaveValue("North");
  });

  it("describes the field with its hint", () => {
    render(<TextField label="Password" hint="At least 10 characters." />);

    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "At least 10 characters.",
    );
  });

  it("marks the field invalid and describes it with the error", () => {
    render(<TextField label="Email" error="The email is invalid." />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("The email is invalid.");
  });

  it("describes the field with both the hint and the error", () => {
    render(
      <TextField
        label="Password"
        hint="At least 10 characters."
        error="Too short."
      />,
    );

    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "At least 10 characters. Too short.",
    );
  });

  it("can render a select or a textarea", () => {
    render(
      <>
        <TextField label="Role" as="select" defaultValue="teacher">
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </TextField>
        <TextField label="About" as="textarea" rows={3} />
      </>,
    );

    expect(screen.getByLabelText("Role").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Role")).toHaveValue("teacher");
    expect(screen.getByLabelText("About").tagName).toBe("TEXTAREA");
  });
});
