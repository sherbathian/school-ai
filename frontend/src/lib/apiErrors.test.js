import { describe, expect, it } from "vitest";
import { errorMessage, validationErrors } from "./apiErrors";

describe("validationErrors", () => {
  it("returns the first message for each field of a 422", () => {
    const error = {
      response: {
        status: 422,
        data: {
          errors: { name: ["Required.", "Too short."], email: ["Invalid."] },
        },
      },
    };

    expect(validationErrors(error)).toEqual({
      name: "Required.",
      email: "Invalid.",
    });
  });

  it("returns null for other statuses", () => {
    expect(
      validationErrors({ response: { status: 500, data: {} } }),
    ).toBeNull();
  });

  it("returns null when there was no response", () => {
    expect(validationErrors(new Error("Network Error"))).toBeNull();
  });
});

describe("errorMessage", () => {
  it.each([
    [403, "You don't have permission to do that."],
    [404, "That item no longer exists."],
    [429, "Too many attempts. Please wait a minute and try again."],
  ])("explains a %i", (status, message) => {
    expect(errorMessage({ response: { status } })).toBe(message);
  });

  it("uses a general fallback for other errors", () => {
    expect(errorMessage({ response: { status: 500 } })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("uses a custom fallback when given one", () => {
    expect(errorMessage(new Error("x"), "Could not load.")).toBe(
      "Could not load.",
    );
  });
});
