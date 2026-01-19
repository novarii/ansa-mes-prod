/**
 * Layout Component
 *
 * App shell component with navigation header and main content area.
 */

import React, { ReactNode } from 'react';
import { NavBar } from '../NavBar/NavBar';
import './Layout.scss';

export interface LayoutProps {
  /** Page content */
  children: ReactNode;
  /** Custom className for the layout wrapper */
  className?: string;
}

/**
 * Layout component - app shell with navigation.
 *
 * @example
 * ```tsx
 * <Layout>
 *   <PageHeader title="Work Orders" />
 *   <WorkOrderList />
 * </Layout>
 * ```
 */
export function Layout({ children, className = '' }: LayoutProps): React.ReactElement {
  const classNames = ['layout', className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <NavBar />
      <main className="layout__main">{children}</main>
    </div>
  );
}
