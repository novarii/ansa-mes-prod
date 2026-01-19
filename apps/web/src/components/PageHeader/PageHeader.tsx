/**
 * PageHeader Component
 *
 * Page title section with optional back button and action area.
 */

import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './PageHeader.scss';

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
  className = '',
}: PageHeaderProps): React.ReactElement {
  const classNames = ['page-header', className].filter(Boolean).join(' ');

  return (
    <header className={classNames}>
      {backTo && (
        <Link to={backTo} className="page-header__back" aria-label={backLabel}>
          <svg
            className="page-header__back-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="page-header__back-text">{backLabel}</span>
        </Link>
      )}

      <div className="page-header__content">
        <div className="page-header__title-group">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
