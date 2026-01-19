/**
 * FormField Component
 *
 * A wrapper for form inputs that provides label, help text, and error message.
 */

import React, { HTMLAttributes, ReactNode } from 'react';
import './FormField.scss';

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
  className = '',
  ...props
}: FormFieldProps): React.ReactElement {
  const hasError = Boolean(error);

  const classNames = ['form-field', hasError && 'form-field--error', className]
    .filter(Boolean)
    .join(' ');

  const messageId = htmlFor ? `${htmlFor}-message` : undefined;

  return (
    <div className={classNames} {...props}>
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="form-field__required">*</span>}
      </label>

      <div className="form-field__control">{children}</div>

      {(error || helpText) && (
        <div
          id={messageId}
          className={`form-field__message ${hasError ? 'form-field__message--error' : 'form-field__message--help'}`}
        >
          {error || helpText}
        </div>
      )}
    </div>
  );
}
