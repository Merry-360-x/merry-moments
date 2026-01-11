import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export default function GlobalLoadingIndicator() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const busy = fetching + mutating > 0;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!busy) {
      setShow(false);
      return;
    }
    const t = window.setTimeout(() => setShow(true), 350);
    return () => window.clearTimeout(t);
  }, [busy]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-card border border-border shadow-card rounded-full px-4 py-2 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-muted-foreground">Loading…</div>
      </div>
    </div>
  );
}

