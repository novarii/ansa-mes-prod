/**
 * Card Component
 *
 * A container component for grouping related content.
 * Supports header, body, footer, and clickable variants.
 */

import React, { HTMLAttributes, ReactNode, KeyboardEvent } from 'react';
import './Card.scss';

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

  const classNames = [
    'card',
    `card--padding-${padding}`,
    noBorder && 'card--no-border',
    noShadow && 'card--no-shadow',
    isClickable && 'card--clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  const hasHeader = title || subtitle || headerActions;

  return (
    <div
      className={classNames}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      {hasHeader && (
        <div className="card__header">
          <div className="card__header-content">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {headerActions && <div className="card__header-actions">{headerActions}</div>}
        </div>
      )}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}
