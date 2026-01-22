/**
 * Shared UI Components
 *
 * This module exports all reusable UI components for the web application.
 * Components are organized into:
 * - UI: shadcn/ui base components (Button, Input, Card, Table, Dialog, etc.)
 * - Layout: App structure components (Layout, NavBar, PageHeader)
 * - Form: Form-specific components (FormField, SearchInput)
 */

// shadcn/ui components
export { Button, buttonVariants } from './ui/button';
export type { ButtonProps } from './ui/button';

export { Input } from './ui/input';

export { Label } from './ui/label';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './ui/card';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './ui/table';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './ui/select';

export { Badge, badgeVariants } from './ui/badge';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

export { Separator } from './ui/separator';

export { Alert, AlertTitle, AlertDescription } from './ui/alert';

export { Spinner, spinnerVariants } from './ui/spinner';
export type { SpinnerProps } from './ui/spinner';

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

export { SearchInput } from './SearchInput/SearchInput';
export type { SearchInputProps } from './SearchInput/SearchInput';

// Legacy components (for backward compatibility - prefer shadcn equivalents for new code)
export { Button as LegacyButton } from './Button/Button';
export { Input as LegacyInput } from './Input/Input';
export { Card as LegacyCard } from './Card/Card';
export { Modal } from './Modal/Modal';
export type { ModalProps, ModalSize } from './Modal/Modal';
export { Table as LegacyTable } from './Table/Table';
export type { TableProps, TableColumn, TableAlignment } from './Table/Table';
export { Select as LegacySelect } from './Select/Select';
export type { SelectProps, SelectOption } from './Select/Select';
