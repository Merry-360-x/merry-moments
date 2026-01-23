import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export type CancellationPolicy = "strict" | "fair" | "lenient";

interface CancellationPolicySelectorProps {
  value: CancellationPolicy;
  onChange: (value: CancellationPolicy) => void;
  showDetails?: boolean;
}

const policyDetails: Record<CancellationPolicy, { title: string; description: string; rules: string[]; color: string }> = {
  strict: {
    title: "Strict",
    description: "Less flexible - fewer refunds",
    color: "destructive",
    rules: [
      "15-30 days before: Full refund (minus fees)",
      "7-15 days: 75% refund (minus fees)",
      "3-7 days: 50% refund (minus fees)",
      "1-3 days: 25% refund (minus fees)",
      "0-1 day: No refund",
      "No-shows: Non-refundable"
    ]
  },
  fair: {
    title: "Fair",
    description: "Balanced approach - moderate refunds",
    color: "default",
    rules: [
      "7-15 days before: Full refund (minus fees)",
      "3-7 days: 75% refund (minus fees)",
      "1-3 days: 50% refund (minus fees)",
      "0-1 day: 25% refund",
      "No-shows: Non-refundable"
    ]
  },
  lenient: {
    title: "Lenient",
    description: "Most flexible - more refunds",
    color: "secondary",
    rules: [
      "3-7 days before: Full refund (minus fees)",
      "1-3 days: 75% refund (minus fees)",
      "0-1 day: 50% refund",
      "No-shows: Non-refundable"
    ]
  }
};

export function CancellationPolicySelector({ value, onChange, showDetails = true }: CancellationPolicySelectorProps) {
  const selectedPolicy = policyDetails[value];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Cancellation Policy</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select cancellation policy" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(policyDetails).map(([key, policy]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{policy.title}</span>
                  <span className="text-xs text-muted-foreground">— {policy.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showDetails && selectedPolicy && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedPolicy.title} Cancellation Policy
              </CardTitle>
              <Badge variant={selectedPolicy.color as any} className="text-xs">
                {selectedPolicy.title}
              </Badge>
            </div>
            <CardDescription>{selectedPolicy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                This policy determines how much refund guests can receive based on when they cancel.
              </p>
            </div>
            <ul className="space-y-1.5">
              {selectedPolicy.rules.map((rule, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { policyDetails };
