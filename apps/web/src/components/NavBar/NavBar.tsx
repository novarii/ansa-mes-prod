/**
 * NavBar Component
 *
 * Navigation header with links, station name, and logout.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../Button/Button';
import './NavBar.scss';

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
export function NavBar({ className = '' }: NavBarProps): React.ReactElement {
  const { empName, stationName, logout } = useAuth();

  const classNames = ['nav', className].filter(Boolean).join(' ');

  const handleLogout = (): void => {
    logout();
  };

  return (
    <nav className={classNames} aria-label="Main navigation">
      <div className="nav__container">
        {/* Logo/Brand */}
        <div className="nav__brand">
          <span className="nav__logo">ANSA MES</span>
        </div>

        {/* Navigation Links */}
        <ul className="nav__links">
          {navItems.map((item) => (
            <li key={item.to} className="nav__item">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav__link ${isActive ? 'nav__link--active' : ''}`
                }
                end={item.to === '/'}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* User Info & Logout */}
        <div className="nav__user">
          <div className="nav__user-info">
            <span className="nav__station">{stationName}</span>
            <span className="nav__username">{empName}</span>
          </div>
          <Button
            variant="ghost"
            size="small"
            onClick={handleLogout}
            aria-label="Cikis Yap"
          >
            Cikis
          </Button>
        </div>
      </div>
    </nav>
  );
}
