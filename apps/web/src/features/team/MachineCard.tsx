/**
 * MachineCard Component
 *
 * Displays a machine with its assigned, paused, and available workers.
 * Used in the Team View to show resource allocation status.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { useMemo, type KeyboardEvent } from 'react';
import { useI18n } from '@org/shared-i18n';
import type { TeamMachineCard, TeamWorker } from '@org/shared-types';
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator } from '@/components';
import { cn } from '@/lib/utils';
import { Settings, User, Circle } from 'lucide-react';

/**
 * Props for MachineCard component
 */
export interface MachineCardProps {
  /** Machine data with workers */
  machine: TeamMachineCard;
  /** Optional click handler - receives machine code */
  onClick?: (machineCode: string) => void;
}

/**
 * Props for WorkerItem component
 */
interface WorkerItemProps {
  /** Worker data */
  worker: TeamWorker;
  /** Worker status for styling */
  status: 'assigned' | 'paused' | 'available';
}

/**
 * Status color mapping
 */
const statusColors = {
  assigned: 'text-success',
  paused: 'text-warning',
  available: 'text-muted-foreground',
} as const;

/**
 * Status background colors for indicators
 */
const statusBgColors = {
  assigned: 'bg-success',
  paused: 'bg-warning',
  available: 'bg-muted-foreground',
} as const;

/**
 * WorkerItem - displays a single worker with status indicator
 */
function WorkerItem({ worker, status }: WorkerItemProps): JSX.Element {
  return (
    <li
      className="flex items-center gap-2 py-1"
      data-worker
      data-status={status}
    >
      <Circle
        className={cn('h-2 w-2 fill-current', statusColors[status])}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">
          {worker.fullName}
        </span>
        {worker.currentWorkOrder && (
          <span className="text-xs text-muted-foreground truncate block">
            #{worker.currentWorkOrder.docNum} - {worker.currentWorkOrder.itemCode}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * WorkerSection - displays a list of workers with a section header
 */
interface WorkerSectionProps {
  /** Section title */
  title: string;
  /** Workers to display */
  workers: TeamWorker[];
  /** Status for styling */
  status: 'assigned' | 'paused' | 'available';
  /** Data attribute for testing */
  sectionId: string;
}

function WorkerSection({
  title,
  workers,
  status,
  sectionId,
}: WorkerSectionProps): JSX.Element | null {
  if (workers.length === 0) {
    return null;
  }

  return (
    <div data-section={sectionId} className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            'inline-block w-2 h-2 rounded-full',
            statusBgColors[status]
          )}
          aria-hidden="true"
        />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title} ({workers.length})
        </h4>
      </div>
      <ul className="space-y-1" role="list" aria-label={title}>
        {workers.map((worker) => (
          <WorkerItem key={worker.empId} worker={worker} status={status} />
        ))}
      </ul>
    </div>
  );
}

/**
 * MachineCard displays a machine with its workers organized by status
 */
export function MachineCard({
  machine,
  onClick,
}: MachineCardProps): JSX.Element {
  const { t } = useI18n();

  // Calculate total workers
  const totalWorkers = useMemo(
    () =>
      machine.assignedWorkers.length +
      machine.pausedWorkers.length +
      machine.availableWorkers.length,
    [machine]
  );

  const hasWorkers = totalWorkers > 0;
  const hasActiveWorkers =
    machine.assignedWorkers.length > 0 || machine.pausedWorkers.length > 0;

  const handleClick = (): void => {
    onClick?.(machine.machineCode);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if ((event.key === 'Enter' || event.key === ' ') && onClick) {
      event.preventDefault();
      onClick(machine.machineCode);
    }
  };

  return (
    <Card
      data-testid={`machine-card-${machine.machineCode}`}
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/50'
      )}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`${machine.machineName} - ${totalWorkers} ${t('team.workers') || 'calisan'}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="truncate">{machine.machineName}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {machine.machineCode}
            </p>
          </div>
          <Badge
            variant={hasActiveWorkers ? 'default' : 'secondary'}
            className="shrink-0"
          >
            <User className="h-3 w-3 mr-1" />
            {totalWorkers}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!hasWorkers ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {t('team.noWorkers') || 'Calisan yok'}
          </div>
        ) : (
          <>
            {/* Assigned Workers (Calisanlar) */}
            <WorkerSection
              title={t('team.assigned') || 'Calisanlar'}
              workers={machine.assignedWorkers}
              status="assigned"
              sectionId="assigned"
            />

            {/* Paused Workers (Molada) */}
            <WorkerSection
              title={t('team.paused') || 'Molada'}
              workers={machine.pausedWorkers}
              status="paused"
              sectionId="paused"
            />

            {/* Separator if there are both active and available workers */}
            {hasActiveWorkers && machine.availableWorkers.length > 0 && (
              <Separator className="my-3" />
            )}

            {/* Available Workers (Musait) */}
            <WorkerSection
              title={t('team.available') || 'Musait'}
              workers={machine.availableWorkers}
              status="available"
              sectionId="available"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default MachineCard;
