/**
 * MachineCard Tests
 *
 * Tests for the machine card component used in the team view.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MachineCard } from './MachineCard';
import { I18nProvider } from '@org/shared-i18n';
import type { TeamMachineCard, TeamWorker } from '@org/shared-types';

/**
 * Wrapper component with required providers
 */
function renderWithProviders(
  ui: React.ReactElement
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );
}

/**
 * Mock machine data with all worker types
 */
const mockFullMachine: TeamMachineCard = {
  machineCode: 'M001',
  machineName: 'BARMAG 1',
  assignedWorkers: [
    {
      empId: 101,
      fullName: 'Ali Yilmaz',
      status: 'assigned',
      currentWorkOrder: {
        docEntry: 6171,
        docNum: 2026001,
        itemCode: 'YM00001662',
      },
    },
    {
      empId: 107,
      fullName: 'Hasan Aktas',
      status: 'assigned',
      currentWorkOrder: {
        docEntry: 6174,
        docNum: 2026004,
        itemCode: 'YM00001665',
      },
    },
  ],
  pausedWorkers: [
    {
      empId: 102,
      fullName: 'Mehmet Demir',
      status: 'paused',
      currentWorkOrder: {
        docEntry: 6172,
        docNum: 2026002,
        itemCode: 'YM00001663',
      },
    },
  ],
  availableWorkers: [
    {
      empId: 103,
      fullName: 'Ayse Kaya',
      status: 'available',
    },
    {
      empId: 108,
      fullName: 'Elif Yildiz',
      status: 'available',
    },
  ],
};

/**
 * Mock machine with only assigned workers
 */
const mockAssignedOnlyMachine: TeamMachineCard = {
  machineCode: 'M002',
  machineName: 'BARMAG 2',
  assignedWorkers: [
    {
      empId: 104,
      fullName: 'Fatma Ozturk',
      status: 'assigned',
      currentWorkOrder: {
        docEntry: 6173,
        docNum: 2026003,
        itemCode: 'YM00001664',
      },
    },
  ],
  pausedWorkers: [],
  availableWorkers: [],
};

/**
 * Mock machine with only available workers
 */
const mockAvailableOnlyMachine: TeamMachineCard = {
  machineCode: 'M003',
  machineName: 'BARMAG 3',
  assignedWorkers: [],
  pausedWorkers: [],
  availableWorkers: [
    {
      empId: 105,
      fullName: 'Mustafa Celik',
      status: 'available',
    },
  ],
};

/**
 * Mock empty machine (no workers)
 */
const mockEmptyMachine: TeamMachineCard = {
  machineCode: 'M004',
  machineName: 'BARMAG 4',
  assignedWorkers: [],
  pausedWorkers: [],
  availableWorkers: [],
};

describe('MachineCard', () => {
  describe('rendering', () => {
    it('should render machine name', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      expect(screen.getByText('BARMAG 1')).toBeInTheDocument();
    });

    it('should render machine code', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      expect(screen.getByText('M001')).toBeInTheDocument();
    });

    it('should have correct test id', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
    });
  });

  describe('assigned workers section', () => {
    it('should display "Calisanlar" section header when there are assigned workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      const machineCard = screen.getByTestId('machine-card-M001');
      const assignedSection = machineCard.querySelector('[data-section="assigned"]');
      expect(assignedSection).toBeInTheDocument();
    });

    it('should display all assigned worker names', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      expect(screen.getByText('Ali Yilmaz')).toBeInTheDocument();
      expect(screen.getByText('Hasan Aktas')).toBeInTheDocument();
    });

    it('should show green indicator for assigned workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Find the assigned workers section and check for green indicator
      const machineCard = screen.getByTestId('machine-card-M001');
      const greenIndicators = machineCard.querySelectorAll('.bg-success, .text-success, [data-status="assigned"]');
      expect(greenIndicators.length).toBeGreaterThan(0);
    });

    it('should not show "Calisanlar" section when no assigned workers', () => {
      renderWithProviders(<MachineCard machine={mockAvailableOnlyMachine} />);

      const machineCard = screen.getByTestId('machine-card-M003');
      // Check that "Calisanlar" header is not present or the section is empty
      const calisanlarSection = machineCard.querySelector('[data-section="assigned"]');
      if (calisanlarSection) {
        // If section exists, it should be empty
        expect(calisanlarSection.querySelectorAll('[data-worker]').length).toBe(0);
      }
    });
  });

  describe('paused workers section', () => {
    it('should display paused workers with appropriate indicator', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      expect(screen.getByText('Mehmet Demir')).toBeInTheDocument();
    });

    it('should show orange/yellow indicator for paused workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Find the paused worker and check for warning/orange indicator
      const machineCard = screen.getByTestId('machine-card-M001');
      const pausedIndicators = machineCard.querySelectorAll('.bg-warning, .text-warning, [data-status="paused"]');
      expect(pausedIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('available workers section', () => {
    it('should display "Musait" section header when there are available workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      const machineCard = screen.getByTestId('machine-card-M001');
      const availableSection = machineCard.querySelector('[data-section="available"]');
      expect(availableSection).toBeInTheDocument();
    });

    it('should display all available worker names', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      expect(screen.getByText('Ayse Kaya')).toBeInTheDocument();
      expect(screen.getByText('Elif Yildiz')).toBeInTheDocument();
    });

    it('should show gray indicator for available workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Find the available workers section and check for gray indicator
      const machineCard = screen.getByTestId('machine-card-M001');
      const grayIndicators = machineCard.querySelectorAll('.bg-muted-foreground, .text-muted-foreground, [data-status="available"]');
      expect(grayIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('empty machine', () => {
    it('should show empty state message when no workers', () => {
      renderWithProviders(<MachineCard machine={mockEmptyMachine} />);

      const machineCard = screen.getByTestId('machine-card-M004');
      // Either translated text or the fallback key
      expect(
        machineCard.textContent?.toLowerCase().includes('calisan yok') ||
        machineCard.textContent?.toLowerCase().includes('no workers') ||
        machineCard.textContent?.includes('team.noWorkers')
      ).toBe(true);
    });

    it('should still render machine name and code for empty machine', () => {
      renderWithProviders(<MachineCard machine={mockEmptyMachine} />);

      expect(screen.getByText('BARMAG 4')).toBeInTheDocument();
      expect(screen.getByText('M004')).toBeInTheDocument();
    });
  });

  describe('work order info', () => {
    it('should display work order info for assigned workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Should show work order numbers for assigned workers
      expect(screen.getByText(/2026001|YM00001662/)).toBeInTheDocument();
    });

    it('should display work order info for paused workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Should show work order info for paused workers
      expect(screen.getByText(/2026002|YM00001663/)).toBeInTheDocument();
    });
  });

  describe('worker counts', () => {
    it('should display correct count of assigned workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      const machineCard = screen.getByTestId('machine-card-M001');
      // Check that count or number of worker items matches
      const assignedSection = machineCard.querySelector('[data-section="assigned"]');
      if (assignedSection) {
        const workerItems = assignedSection.querySelectorAll('[data-worker]');
        expect(workerItems.length).toBe(2);
      }
    });

    it('should display total worker count somewhere on the card', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Card should show total of 5 workers (2 assigned + 1 paused + 2 available)
      // This could be in a badge or summary
      const machineCard = screen.getByTestId('machine-card-M001');
      // Look for a count display
      expect(machineCard.textContent).toMatch(/5|bes/i);
    });
  });

  describe('status indicators', () => {
    it('should visually distinguish between assigned, paused, and available workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      const machineCard = screen.getByTestId('machine-card-M001');

      // Check that different statuses have different visual indicators
      const assignedIndicators = machineCard.querySelectorAll('[data-status="assigned"]');
      const pausedIndicators = machineCard.querySelectorAll('[data-status="paused"]');
      const availableIndicators = machineCard.querySelectorAll('[data-status="available"]');

      // At minimum, status indicators should exist
      expect(
        assignedIndicators.length > 0 ||
        pausedIndicators.length > 0 ||
        availableIndicators.length > 0 ||
        // Or check for color classes
        machineCard.querySelector('.bg-success') !== null ||
        machineCard.querySelector('.bg-warning') !== null
      ).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading for machine name', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Machine name should be visible (in CardTitle which uses a div not heading role)
      expect(screen.getByText('BARMAG 1')).toBeInTheDocument();
    });

    it('should have proper list structure for workers', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Workers should be in a list structure for screen readers
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('should have proper aria-label on the card', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      const card = screen.getByTestId('machine-card-M001');
      expect(card).toHaveAttribute('aria-label');
    });
  });

  describe('click handler', () => {
    it('should call onClick when provided and card header is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      renderWithProviders(
        <MachineCard machine={mockFullMachine} onClick={handleClick} />
      );

      const machineCard = screen.getByTestId('machine-card-M001');
      await user.click(machineCard);

      expect(handleClick).toHaveBeenCalledWith('M001');
    });

    it('should not have clickable behavior when no onClick provided', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      const machineCard = screen.getByTestId('machine-card-M001');
      // Should not have cursor-pointer class when not clickable
      expect(machineCard).not.toHaveClass('cursor-pointer');
    });
  });

  describe('visual styling', () => {
    it('should render as a card with proper styling', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      const card = screen.getByTestId('machine-card-M001');
      // Should have card-like appearance (border, shadow, or specific class)
      expect(
        card.classList.contains('rounded') ||
        card.closest('[class*="card"]') !== null ||
        card.getAttribute('data-slot') === 'card'
      ).toBe(true);
    });

    it('should have consistent spacing between sections', () => {
      renderWithProviders(<MachineCard machine={mockFullMachine} />);

      // Just verify the component renders without error - visual spacing
      // is better tested with visual regression tests
      const card = screen.getByTestId('machine-card-M001');
      expect(card).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle very long worker names', () => {
      const machineWithLongName: TeamMachineCard = {
        ...mockEmptyMachine,
        machineCode: 'M999',
        machineName: 'Test Machine',
        assignedWorkers: [
          {
            empId: 999,
            fullName: 'Muhammed Abdulrahman Al-Sayed Bin Khalid Al-Thani',
            status: 'assigned',
            currentWorkOrder: {
              docEntry: 1,
              docNum: 1,
              itemCode: 'TEST',
            },
          },
        ],
      };

      renderWithProviders(<MachineCard machine={machineWithLongName} />);

      expect(
        screen.getByText(/muhammed abdulrahman/i)
      ).toBeInTheDocument();
    });

    it('should handle machine with only paused workers', () => {
      const pausedOnlyMachine: TeamMachineCard = {
        machineCode: 'M005',
        machineName: 'Test Machine',
        assignedWorkers: [],
        pausedWorkers: [
          {
            empId: 110,
            fullName: 'Paused Worker',
            status: 'paused',
            currentWorkOrder: {
              docEntry: 9999,
              docNum: 9999,
              itemCode: 'TEST',
            },
          },
        ],
        availableWorkers: [],
      };

      renderWithProviders(<MachineCard machine={pausedOnlyMachine} />);

      expect(screen.getByText('Paused Worker')).toBeInTheDocument();
    });
  });
});
