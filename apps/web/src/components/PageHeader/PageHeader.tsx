/**
 * PageHeader Component
 *
 * Page title section with optional back button and action area.
 */

import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Path for back button (omit to hide back button) */
  backTo?: string;
  /** Custom back button label */
  backLabel?: string;
  /** Action buttons/elements */
  actions?: ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * PageHeader component for page titles and navigation.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Work Order Detail"
 *   subtitle="WO-2026-001"
 *   backTo="/work-orders"
 *   actions={<Button>Edit</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Geri',
  actions,
  className,
}: PageHeaderProps): React.ReactElement {
  return (
    <header className={cn('mb-6 space-y-4', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={backLabel}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
