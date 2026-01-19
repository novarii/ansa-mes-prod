/**
 * Layout Component
 *
 * App shell component with navigation header and main content area.
 */

import React, { ReactNode } from 'react';
import { NavBar } from '../NavBar/NavBar';
import { cn } from '@/lib/utils';

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
export function Layout({ children, className }: LayoutProps): React.ReactElement {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
