import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

interface HostCreationSubpageProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
  backLabel?: string;
  maxWidthClassName?: string;
}

export function HostCreationSubpage({
  title,
  subtitle,
  onBack,
  children,
  backLabel = "Back to Dashboard",
  maxWidthClassName = "max-w-3xl",
}: HostCreationSubpageProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Navbar />
      <div className={`container mx-auto px-4 py-8 ${maxWidthClassName}`}>
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
            {backLabel}
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="w-32" />
        </div>

        {children}
      </div>
    </div>
  );
}
