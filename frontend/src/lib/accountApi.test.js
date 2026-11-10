import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import { changePassword } from "./accountApi";

vi.mock("../api", () => ({ default: { post: vi.fn() } }));

describe("accountApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("posts the password change", async () => {
    api.post.mockResolvedValue({});
    const values = {
      current_password: "old-passphrase-1",
      password: "new-passphrase-22",
      password_confirmation: "new-passphrase-22",
    };

    await changePassword(values);

    expect(api.post).toHaveBeenCalledWith("/me/password", values);
  });
});
