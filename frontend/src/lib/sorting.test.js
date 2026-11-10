import { describe, expect, it } from "vitest";
import { byTitle } from "./sorting";

const titles = (items) => items.map((item) => item.title);

describe("byTitle", () => {
  it("sorts alphabetically", () => {
    const items = [{ title: "C" }, { title: "A" }, { title: "B" }];

    expect(titles(items.sort(byTitle))).toEqual(["A", "B", "C"]);
  });

  it("puts numbers in numeric order", () => {
    const items = [
      { title: "Grade 10" },
      { title: "Grade 2" },
      { title: "Grade 1" },
    ];

    expect(titles(items.sort(byTitle))).toEqual([
      "Grade 1",
      "Grade 2",
      "Grade 10",
    ]);
  });
});
