/**
 * ValidatedInput Component
 * Input field with built-in validation and error display
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getInputClassName } from "@/lib/form-validation";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  showError?: boolean;
  helpText?: string;
  containerClassName?: string;
}

export function ValidatedInput({
  label,
  error,
  touched = false,
  showError = true,
  helpText,
  className,
  containerClassName,
  required,
  ...props
}: ValidatedInputProps) {
  const hasError = touched && !!error;

  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <Label htmlFor={props.id} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <Input
        {...props}
        className={cn(
          className,
          hasError && "border-red-500 focus-visible:ring-red-500"
        )}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${props.id}-error` : undefined}
      />
      
      {hasError && showError && (
        <div id={`${props.id}-error`} className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {!hasError && helpText && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  showError?: boolean;
  helpText?: string;
  containerClassName?: string;
}

export function ValidatedTextarea({
  label,
  error,
  touched = false,
  showError = true,
  helpText,
  className,
  containerClassName,
  required,
  ...props
}: ValidatedTextareaProps) {
  const hasError = touched && !!error;

  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <Label htmlFor={props.id} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <Textarea
        {...props}
        className={cn(
          className,
          hasError && "border-red-500 focus-visible:ring-red-500"
        )}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${props.id}-error` : undefined}
      />
      
      {hasError && showError && (
        <div id={`${props.id}-error`} className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {!hasError && helpText && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

/**
 * Form validation summary component
 * Shows all validation errors in a summary box
 */
interface ValidationSummaryProps {
  errors: Record<string, string>;
  title?: string;
  className?: string;
}

export function ValidationSummary({ errors, title = "Please fix the following errors:", className }: ValidationSummaryProps) {
  const errorCount = Object.keys(errors).length;

  if (errorCount === 0) return null;

  return (
    <div className={cn("bg-red-50 border-2 border-red-200 rounded-lg p-4", className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 mb-2">{title}</h4>
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field} className="text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
