/**
 * NavBar Component
 *
 * Navigation header with links, station name, and logout.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export interface NavBarProps {
  /** Custom className */
  className?: string;
}

interface NavItem {
  to: string;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Anasayfa' },
  { to: '/team', label: 'Ekibim' },
  { to: '/calendar', label: 'Takvim' },
];

/**
 * NavBar component with navigation links and user info.
 *
 * @example
 * ```tsx
 * <NavBar />
 * ```
 */
export function NavBar({ className }: NavBarProps): React.ReactElement {
  const { empName, stationName, logout } = useAuth();

  const handleLogout = (): void => {
    logout();
  };

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
      aria-label="Main navigation"
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-primary">ANSA MES</span>

          {/* Navigation Links */}
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive && 'bg-accent text-accent-foreground'
                    )
                  }
                  end={item.to === '/'}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-sm">
            <span className="font-medium text-foreground">{stationName}</span>
            <span className="text-muted-foreground">{empName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Cikis Yap"
          >
            <LogOut className="mr-2 size-4" />
            Cikis
          </Button>
        </div>
      </div>
    </nav>
  );
}
