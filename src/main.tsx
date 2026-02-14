import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Suppress AbortError from console - these are expected during navigation and component cleanup
// This prevents "Uncaught (in promise) AbortError" from cluttering the console
if (typeof window !== "undefined") {
  const CHUNK_RELOAD_GUARD_KEY = "merry360_chunk_reload_guard";
  const CHUNK_RELOAD_MAX_ATTEMPTS = 3;
  const CHUNK_RELOAD_WINDOW_MS = 60_000;

  type ChunkReloadGuard = {
    count: number;
    firstAt: number;
  };

  const readReloadGuard = (): ChunkReloadGuard => {
    try {
      const raw = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
      if (!raw) {
        return { count: 0, firstAt: Date.now() };
      }
      const parsed = JSON.parse(raw) as Partial<ChunkReloadGuard>;
      return {
        count: Number.isFinite(parsed.count) ? Number(parsed.count) : 0,
        firstAt: Number.isFinite(parsed.firstAt) ? Number(parsed.firstAt) : Date.now(),
      };
    } catch {
      return { count: 0, firstAt: Date.now() };
    }
  };

  const writeReloadGuard = (guard: ChunkReloadGuard) => {
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, JSON.stringify(guard));
  };

  const isDynamicImportFailure = (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason ?? "");
    const lowered = msg.toLowerCase();
    return (
      lowered.includes("failed to fetch dynamically imported module") ||
      lowered.includes("importing a module script failed") ||
      lowered.includes("loading chunk") ||
      lowered.includes("loading css chunk") ||
      lowered.includes("dynamically imported module")
    );
  };

  const reloadOnceForChunkFailure = () => {
    const now = Date.now();
    const currentGuard = readReloadGuard();
    const inWindow = now - currentGuard.firstAt <= CHUNK_RELOAD_WINDOW_MS;
    const nextGuard: ChunkReloadGuard = inWindow
      ? { count: currentGuard.count + 1, firstAt: currentGuard.firstAt }
      : { count: 1, firstAt: now };

    writeReloadGuard(nextGuard);

    if (nextGuard.count > CHUNK_RELOAD_MAX_ATTEMPTS) {
      console.error("Chunk reload guard exceeded max attempts", nextGuard);
      return;
    }

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
