import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ message = "Loading...", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-full border-2 border-primary/20" />
        <Loader2 className="w-14 h-14 text-primary animate-[spin_700ms_linear_infinite] absolute inset-0" />
      </div>
      <div className="flex items-center gap-1.5 mb-2" aria-hidden>
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-200ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-100ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
