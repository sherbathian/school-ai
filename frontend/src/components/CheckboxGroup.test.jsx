import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CheckboxGroup from "./CheckboxGroup";

const options = [
  { id: 1, label: "A" },
  { id: 2, label: "B" },
  { id: 3, label: "C" },
];

function setup(props = {}) {
  const onChange = vi.fn();
  render(
    <CheckboxGroup
      legend="Sections"
      options={options}
      value={[]}
      onChange={onChange}
      {...props}
    />,
  );

  return { onChange, actor: userEvent.setup() };
}

describe("CheckboxGroup", () => {
  it("is a group named by its legend, with one checkbox per option", () => {
    setup();

    const group = screen.getByRole("group", { name: "Sections" });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(3);
  });

  it("ticks the options that are selected", () => {
    setup({ value: [1, 3] });

    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "B" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "C" })).toBeChecked();
  });

  it("adds an option to the selection when it is ticked", async () => {
    const { onChange, actor } = setup({ value: [1] });

    await actor.click(screen.getByRole("checkbox", { name: "B" }));

    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it("removes an option from the selection when it is unticked", async () => {
    const { onChange, actor } = setup({ value: [1, 2] });

    await actor.click(screen.getByRole("checkbox", { name: "A" }));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("describes the group with its error", () => {
    setup({ error: "Pick valid sections." });

    expect(
      screen.getByRole("group", { name: "Sections" }),
    ).toHaveAccessibleDescription("Pick valid sections.");
  });

  it("says so when there is nothing to choose", () => {
    setup({ options: [], emptyMessage: "No sections yet." });

    expect(screen.getByText("No sections yet.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
