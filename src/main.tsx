import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Suppress AbortError from console - these are expected during navigation and component cleanup
// This prevents "Uncaught (in promise) AbortError" from cluttering the console
if (typeof window !== "undefined") {
  const CHUNK_RELOAD_GUARD_KEY = "merry360_chunk_reload_once";
  const isDynamicImportFailure = (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason ?? "");
    const lowered = msg.toLowerCase();
    return (
      lowered.includes("failed to fetch dynamically imported module") ||
      lowered.includes("importing a module script failed")
    );
  };

  const reloadOnceForChunkFailure = () => {
    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1";
    if (alreadyReloaded) return;
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(Date.now()));
    window.location.replace(url.toString());
  };

  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;

    if (isDynamicImportFailure(error)) {
      event.preventDefault();
      reloadOnceForChunkFailure();
      return;
    }

    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.message?.includes("aborted") ||
        error.message?.includes("signal is aborted"))
    ) {
      event.preventDefault();
      return;
    }
  });

  window.addEventListener("error", (event) => {
    if (isDynamicImportFailure(event.error || event.message)) {
      event.preventDefault();
      reloadOnceForChunkFailure();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
