/**
 * Table Component
 *
 * A basic table component with loading state and custom cell rendering support.
 */

import React, { ReactNode, TableHTMLAttributes } from 'react';
import './Table.scss';

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
export function Table<T extends Record<string, unknown>>({
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

  const classNames = ['table-container', className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <table className="table" {...props}>
        <thead className="table__head">
          <tr className="table__row">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`table__header table__cell--${column.align || 'left'}`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {data.length === 0 && !loading ? (
            <tr className="table__row table__row--empty">
              <td className="table__cell table__cell--empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)} className="table__row">
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td
                      key={String(column.key)}
                      className={`table__cell table__cell--${column.align || 'left'}`}
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
        <div className="table__loading">
          <span className="table__loading-text">Yukleniyor...</span>
        </div>
      )}
    </div>
  );
}
