import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SchoolForm from "./SchoolForm";

const empty = {
  name: "",
  url: "",
  phone: "",
  email: "",
  address: "",
  about: "",
  status: "active",
};

function setup(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue();
  render(
    <SchoolForm
      initialValues={empty}
      submitLabel="Save"
      {...props}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit, actor: userEvent.setup() };
}

describe("SchoolForm", () => {
  it("shows labelled fields and no status by default", () => {
    setup();

    for (const label of [
      "Name",
      "Email",
      "Phone",
      "Website",
      "Address",
      "About",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
  });

  it("shows the status field when asked", () => {
    setup({ showStatus: true });

    expect(screen.getByLabelText("Status")).toHaveValue("active");
  });

  it("starts with the given values", () => {
    setup({ initialValues: { ...empty, name: "North" } });

    expect(screen.getByLabelText("Name")).toHaveValue("North");
  });

  it("submits what was typed, without a status", async () => {
    const { onSubmit, actor } = setup();

    await actor.type(screen.getByLabelText("Name"), "North");
    await actor.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "North",
      url: "",
      phone: "",
      email: "",
      address: "",
      about: "",
    });
  });

  it("includes the status when it can be changed", async () => {
    const { onSubmit, actor } = setup({ showStatus: true });

    await actor.selectOptions(screen.getByLabelText("Status"), "inactive");
    await actor.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "inactive" }),
    );
  });

  it("shows validation errors next to their fields", async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { name: ["The name field is required."] } },
      },
    });
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("The name field is required."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(
      "The name field is required.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please fix the highlighted fields.",
    );
  });

  it("shows a general message for other errors", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { status: 403 } });
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You don't have permission",
    );
  });

  it("disables the button while saving", async () => {
    const onSubmit = vi.fn().mockReturnValue(new Promise(() => {})); // never finishes
    const { actor } = setup({ onSubmit });

    await actor.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
  });
});
