import { useEffect, useState } from "react";
import api from "../api";

export default function HealthStatus() {
  // One state object holds which "screen" we're on: loading, ok, or error.
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/health", { signal: controller.signal })
      .then((response) => setState({ status: "ok", data: response.data }))
      .catch((error) => {
        // A cancelled request is not a real error, so ignore it.
        if (error.code === "ERR_CANCELED") return;
        setState({ status: "error", http: error.response?.status ?? null });
      });

    // Cleanup: cancel the request if the component goes away.
    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return <p role="status">Checking API…</p>;
  }

  if (state.status === "error") {
    return (
      <p role="alert">
        {state.http === 503
          ? "The API is up, but its database is down."
          : "Can't reach the API."}
      </p>
    );
  }

  return (
    <p role="status">
      API: {state.data.status} · Database: {state.data.database}
    </p>
  );
}
