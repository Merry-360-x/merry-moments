import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export default function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  
  const isLoading = isFetching > 0 || isMutating > 0;

  if (!isLoading) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-md px-3 py-2 shadow-lg">
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Loading...</span>
    </div>
  );
}

