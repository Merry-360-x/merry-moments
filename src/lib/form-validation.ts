/**
 * Form Validation Utilities
 * Provides validation helpers with visual feedback for required fields
 */

import { useCallback, useState } from "react";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null; // Returns error message or null
  message?: string; // Custom error message
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * Validate a single field against its rules
 */
export function validateField(value: any, rules: ValidationRule, fieldName: string): string | null {
  // Required validation
  if (rules.required) {
    if (value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      return rules.message || `${fieldName} is required`;
    }
  }

  // Skip other validations if value is empty (and not required)
  if (!value && !rules.required) return null;

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `${fieldName} must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `${fieldName} must not exceed ${rules.maxLength} characters`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || `${fieldName} format is invalid`;
    }
  }

  // Number validations
  if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
    const numValue = Number(value);
    if (rules.min !== undefined && numValue < rules.min) {
      return rules.message || `${fieldName} must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && numValue > rules.max) {
      return rules.message || `${fieldName} must not exceed ${rules.max}`;
    }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

/**
 * Validate all fields in a form
 */
export function validateForm(formData: any, rules: ValidationRules): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const value = formData[fieldName];
    const error = validateField(value, fieldRules, fieldName);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
}

/**
 * Hook for form validation with error state management
 */
export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const validateSingleField = useCallback((fieldName: string, value: any) => {
    const fieldRules = rules[fieldName];
    if (!fieldRules) return null;

    const error = validateField(value, fieldRules, fieldName);
    setErrors(prev => {
      const next = { ...prev };
      if (error) {
        next[fieldName] = error;
      } else {
        delete next[fieldName];
      }
      return next;
    });
    return error;
  }, [rules]);

  const validateAllFields = useCallback((formData: any): boolean => {
    const validationErrors = validateForm(formData, rules);
    setErrors(validationErrors);
    
    // Mark all fields as touched
    setTouched(new Set(Object.keys(rules)));
    
    return Object.keys(validationErrors).length === 0;
  }, [rules]);

  const markTouched = useCallback((fieldName: string) => {
    setTouched(prev => new Set([...prev, fieldName]));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched(new Set());
  }, []);

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return touched.has(fieldName) ? errors[fieldName] : undefined;
  }, [errors, touched]);

  const hasError = useCallback((fieldName: string): boolean => {
    return touched.has(fieldName) && !!errors[fieldName];
  }, [errors, touched]);

  return {
    errors,
    touched,
    validateSingleField,
    validateAllFields,
    markTouched,
    clearErrors,
    getFieldError,
    hasError,
  };
}

/**
 * Get CSS classes for error state (red border)
 */
export function getErrorClassName(hasError: boolean): string {
  return hasError ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";
}

/**
 * Get combined className for input with error state
 */
export function getInputClassName(baseClassName: string, hasError: boolean): string {
  const errorClasses = hasError ? " border-red-500 focus:ring-red-500 focus:border-red-500" : "";
  return baseClassName + errorClasses;
}

/**
 * Common validation rules
 */
export const commonValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },
  phone: {
    pattern: /^[\d\s\-\+\(\)]+$/,
    message: "Please enter a valid phone number",
  },
  url: {
    pattern: /^https?:\/\/.+/,
    message: "Please enter a valid URL starting with http:// or https://",
  },
  positiveNumber: {
    min: 0.01,
    message: "Must be a positive number",
  },
  wholeNumber: {
    min: 1,
    custom: (value: any) => {
      const num = Number(value);
      if (!Number.isInteger(num)) return "Must be a whole number";
      return null;
    },
  },
};
