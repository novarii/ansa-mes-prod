/**
 * Shared UI Components
 *
 * This module exports all reusable UI components for the web application.
 * Components are organized into three categories:
 * - Core: Basic building blocks (Button, Input, Modal, Table, Card, Spinner)
 * - Layout: Page structure components (Layout, NavBar, PageHeader)
 * - Form: Form-specific components (FormField, Select, SearchInput)
 */

// Core components
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';

export { Input } from './Input/Input';
export type { InputProps } from './Input/Input';

export { Modal } from './Modal/Modal';
export type { ModalProps } from './Modal/Modal';

export { Table } from './Table/Table';
export type { TableProps, TableColumn } from './Table/Table';

export { Card } from './Card/Card';
export type { CardProps } from './Card/Card';

export { Spinner } from './Spinner/Spinner';
export type { SpinnerProps } from './Spinner/Spinner';

// Layout components
export { Layout } from './Layout/Layout';
export type { LayoutProps } from './Layout/Layout';

export { NavBar } from './NavBar/NavBar';
export type { NavBarProps } from './NavBar/NavBar';

export { PageHeader } from './PageHeader/PageHeader';
export type { PageHeaderProps } from './PageHeader/PageHeader';

// Form components
export { FormField } from './FormField/FormField';
export type { FormFieldProps } from './FormField/FormField';

export { Select } from './Select/Select';
export type { SelectProps, SelectOption } from './Select/Select';

export { SearchInput } from './SearchInput/SearchInput';
export type { SearchInputProps } from './SearchInput/SearchInput';
