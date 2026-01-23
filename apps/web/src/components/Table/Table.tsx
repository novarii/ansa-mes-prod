/**
 * Table Component (Legacy)
 *
 * A basic table component with loading state and custom cell rendering support.
 *
 * @deprecated Prefer using the shadcn Table from './ui/table' for new code.
 */

import React, { ReactNode, TableHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type TableAlignment = 'left' | 'center' | 'right';

export interface TableColumn<T> {
  /** Unique key for the column, used to access row data */
  key: keyof T;
  /** Header text */
  header: string;
  /** Column width (CSS value) */
  width?: string;
  /** Text alignment */
  align?: TableAlignment;
  /** Custom cell renderer */
  render?: (value: T[keyof T], row: T, index: number) => ReactNode;
}

export interface TableProps<T>
  extends Omit<TableHTMLAttributes<HTMLTableElement>, 'children'> {
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Data rows */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** Custom message when table is empty */
  emptyMessage?: string;
  /** Function to extract unique key from row */
  keyExtractor?: (row: T, index: number) => string;
}

const alignStyles: Record<TableAlignment, string> = {
  left: 'text-left table__cell--left',
  center: 'text-center table__cell--center',
  right: 'text-right table__cell--right',
};

/**
 * Table component for displaying tabular data.
 *
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'id', header: 'ID', width: '80px' },
 *   { key: 'name', header: 'Name' },
 *   { key: 'status', header: 'Status', render: (v) => <Badge>{v}</Badge> },
 * ];
 *
 * <Table columns={columns} data={items} loading={isLoading} />
 * ```
 */
export function Table<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Veri bulunamadi',
  keyExtractor,
  className = '',
  ...props
}: TableProps<T>): React.ReactElement {
  const getRowKey = (row: T, index: number): string => {
    if (keyExtractor) {
      return keyExtractor(row, index);
    }
    // Try common key fields
    if ('id' in row) {
      return String(row.id);
    }
    if ('key' in row) {
      return String(row.key);
    }
    return String(index);
  };

  return (
    <div className={cn('relative w-full overflow-auto', className)}>
      <table className="w-full caption-bottom text-sm" {...props}>
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'h-10 px-2 font-medium text-muted-foreground',
                  alignStyles[column.align || 'left']
                )}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.length === 0 && !loading ? (
            <tr className="border-b transition-colors table__row--empty">
              <td
                className="p-2 align-middle text-center text-muted-foreground table__cell--empty"
                colSpan={columns.length}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex)}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td
                      key={String(column.key)}
                      className={cn('p-2 align-middle', alignStyles[column.align || 'left'])}
                    >
                      {column.render
                        ? column.render(value, row, rowIndex)
                        : String(value ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-sm text-muted-foreground">Yukleniyor...</span>
        </div>
      )}
    </div>
  );
}
