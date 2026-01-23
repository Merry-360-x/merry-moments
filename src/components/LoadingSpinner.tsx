import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ message = "Loading...", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
