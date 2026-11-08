import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import HealthStatus from "./HealthStatus";

// Replace the real api module with a fake whose `get` we control.
vi.mock("../api", () => ({ default: { get: vi.fn() } }));

describe("HealthStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading message first", () => {
    api.get.mockReturnValue(new Promise(() => {})); // never answers
    render(<HealthStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("Checking API");
  });

  it("shows the API and database status on success", async () => {
    api.get.mockResolvedValue({ data: { status: "ok", database: "up" } });
    render(<HealthStatus />);

    expect(
      await screen.findByText(/API: ok · Database: up/),
    ).toBeInTheDocument();
  });

  it("explains a 503 (API up, database down)", async () => {
    api.get.mockRejectedValue({ response: { status: 503 } });
    render(<HealthStatus />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "database is down",
    );
  });

  it("explains when the API can't be reached", async () => {
    api.get.mockRejectedValue(new Error("Network Error"));
    render(<HealthStatus />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can't reach the API",
    );
  });
});
