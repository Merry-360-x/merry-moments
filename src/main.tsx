import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Suppress AbortError from console - these are expected during navigation and component cleanup
// This prevents "Uncaught (in promise) AbortError" from cluttering the console
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
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
}

createRoot(document.getElementById("root")!).render(<App />);
