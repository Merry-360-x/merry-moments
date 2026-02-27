import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export default function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isLoading = isFetching > 0 || isMutating > 0;

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="h-1 w-full bg-primary/15 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-primary/80 animate-[pulse_700ms_ease-in-out_infinite]" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-primary/60 animate-[pulse_700ms_ease-in-out_infinite] [animation-delay:150ms]" />
      </div>
    </div>
  );
}

