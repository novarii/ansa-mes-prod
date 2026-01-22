/**
 * FormField Component
 *
 * A wrapper for form inputs that provides label, help text, and error message.
 */

import React, { HTMLAttributes, ReactNode } from 'react';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Field label */
  label: string;
  /** ID of the input element (for label association) */
  htmlFor?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Help text displayed below the input */
  helpText?: string;
  /** Error message (replaces help text when present) */
  error?: string;
  /** Form control element */
  children: ReactNode;
}

/**
 * FormField component wrapping inputs with labels and messages.
 *
 * @example
 * ```tsx
 * <FormField label="Email" htmlFor="email" required error={errors.email}>
 *   <Input id="email" error={!!errors.email} />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  htmlFor,
  required = false,
  helpText,
  error,
  children,
  className,
  ...props
}: FormFieldProps): React.ReactElement {
  const hasError = Boolean(error);
  const messageId = htmlFor ? `${htmlFor}-message` : undefined;

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <Label htmlFor={htmlFor} className={cn(hasError && 'text-destructive')}>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      <div>{children}</div>

      {(error || helpText) && (
        <p
          id={messageId}
          className={cn(
            'text-sm',
            hasError ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {error || helpText}
        </p>
      )}
    </div>
  );
}
