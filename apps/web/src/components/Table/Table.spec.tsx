/**
 * Table Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table, TableColumn } from './Table';

interface TestData {
  id: number;
  name: string;
  email: string;
}

const testData: TestData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
];

const testColumns: TableColumn<TestData>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
];

describe('Table', () => {
  describe('rendering', () => {
    it('should render table with headers', () => {
      render(<Table columns={testColumns} data={testData} />);

      expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    });

    it('should render table with data rows', () => {
      render(<Table columns={testColumns} data={testData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      render(<Table columns={testColumns} data={testData} />);

      const rows = screen.getAllByRole('row');
      // 1 header row + 2 data rows
      expect(rows).toHaveLength(3);
    });
  });

  describe('empty state', () => {
    it('should render empty message when no data', () => {
      render(<Table columns={testColumns} data={[]} />);

      expect(screen.getByText('Veri bulunamadi')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      render(
        <Table columns={testColumns} data={[]} emptyMessage="Custom empty message" />
      );

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should render loading state', () => {
      render(<Table columns={testColumns} data={[]} loading />);

      expect(screen.getByText('Yukleniyor...')).toBeInTheDocument();
    });

    it('should show loading overlay with data', () => {
      render(<Table columns={testColumns} data={testData} loading />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Yukleniyor...')).toBeInTheDocument();
    });
  });

  describe('custom rendering', () => {
    it('should render with custom cell renderer', () => {
      const columnsWithRenderer: TableColumn<TestData>[] = [
        {
          key: 'name',
          header: 'Name',
          render: (value: string | number, row: TestData) => <strong data-testid={`name-${row.id}`}>{String(value)}</strong>,
        },
      ];

      render(<Table columns={columnsWithRenderer} data={testData} />);

      expect(screen.getByTestId('name-1')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('name-2')).toHaveTextContent('Jane Smith');
    });

    it('should support width on columns', () => {
      const columnsWithWidth: TableColumn<TestData>[] = [
        { key: 'id', header: 'ID', width: '100px' },
        { key: 'name', header: 'Name' },
      ];

      render(<Table columns={columnsWithWidth} data={testData} />);

      const idHeader = screen.getByRole('columnheader', { name: 'ID' });
      expect(idHeader).toHaveStyle({ width: '100px' });
    });
  });

  describe('keyExtractor', () => {
    it('should use custom key extractor', () => {
      const { container } = render(
        <Table
          columns={testColumns}
          data={testData}
          keyExtractor={(row: TestData) => `custom-${row.id}`}
        />
      );

      // Table renders without key-related warnings
      expect(container.querySelector('table')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have table role', () => {
      render(<Table columns={testColumns} data={testData} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should have proper header structure', () => {
      render(<Table columns={testColumns} data={testData} />);

      const table = screen.getByRole('table');
      expect(table.querySelector('thead')).toBeInTheDocument();
      expect(table.querySelector('tbody')).toBeInTheDocument();
    });

    it('should accept aria-label', () => {
      render(<Table columns={testColumns} data={testData} aria-label="Users table" />);

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Users table');
    });
  });

  describe('alignment', () => {
    it('should support column alignment', () => {
      const columnsWithAlign: TableColumn<TestData>[] = [
        { key: 'id', header: 'ID', align: 'right' },
        { key: 'name', header: 'Name', align: 'center' },
        { key: 'email', header: 'Email', align: 'left' },
      ];

      render(<Table columns={columnsWithAlign} data={testData} />);

      const rows = screen.getAllByRole('row');
      const dataRow = rows[1]; // First data row
      const cells = dataRow.querySelectorAll('td');

      expect(cells[0]).toHaveClass('table__cell--right');
      expect(cells[1]).toHaveClass('table__cell--center');
      expect(cells[2]).toHaveClass('table__cell--left');
    });
  });
});
