import { describe, expect, it } from "vitest";
import { errorMessage, firstErrorMessage, validationErrors } from "./apiErrors";

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

  describe("firstErrorMessage", () => {
    it("returns the first validation message", () => {
      const error = {
        response: {
          status: 422,
          data: {
            errors: { role: ["A school must keep at least one admin."] },
          },
        },
      };

      expect(firstErrorMessage(error)).toBe(
        "A school must keep at least one admin.",
      );
    });

    it("falls back to the message for the status", () => {
      expect(firstErrorMessage({ response: { status: 403 } })).toBe(
        "You don't have permission to do that.",
      );
    });

    it("falls back to the given text for anything else", () => {
      expect(firstErrorMessage(new Error("x"), "Could not save.")).toBe(
        "Could not save.",
      );
    });
  });