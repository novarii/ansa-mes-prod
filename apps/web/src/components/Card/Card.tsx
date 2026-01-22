/**
 * Card Component (Legacy)
 *
 * A container component for grouping related content.
 * Supports header, body, footer, and clickable variants.
 *
 * @deprecated Prefer using the shadcn Card from './ui/card' for new code.
 */

import React, { HTMLAttributes, ReactNode, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export type CardPadding = 'none' | 'compact' | 'default';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Actions to display in header (right side) */
  headerActions?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Body padding variant */
  padding?: CardPadding;
  /** Remove border */
  noBorder?: boolean;
  /** Remove shadow */
  noShadow?: boolean;
  /** Click handler - makes card interactive */
  onClick?: () => void;
  /** Card content */
  children: ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  compact: 'p-3',
  default: 'p-6',
};

/**
 * Card component for grouping content.
 *
 * @example
 * ```tsx
 * <Card title="Work Order" subtitle="WO-2026-001">
 *   <p>Order details...</p>
 * </Card>
 *
 * <Card onClick={() => navigate('/detail')} padding="compact">
 *   Clickable card content
 * </Card>
 * ```
 */
export function Card({
  title,
  subtitle,
  headerActions,
  footer,
  padding = 'default',
  noBorder = false,
  noShadow = false,
  onClick,
  children,
  className = '',
  ...props
}: CardProps): React.ReactElement {
  const isClickable = Boolean(onClick);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  const hasHeader = title || subtitle || headerActions;

  return (
    <div
      className={cn(
        'rounded-xl bg-card text-card-foreground',
        !noBorder && 'border card--border',
        !noShadow && 'shadow-xs card--shadow',
        isClickable && 'cursor-pointer hover:shadow-md transition-shadow card--clickable',
        `card--padding-${padding}`,
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      {hasHeader && (
        <div className={cn('flex items-start justify-between gap-4', padding !== 'none' && 'px-6 pt-6')}>
          <div className="space-y-1">
            {title && <h3 className="font-semibold leading-none tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}
      <div className={cn(paddingStyles[padding])}>{children}</div>
      {footer && (
        <div className={cn('flex items-center', padding !== 'none' && 'px-6 pb-6')}>
          {footer}
        </div>
      )}
    </div>
  );
}
