/**
 * Work Order Card Component
 *
 * Displays a work order summary in a card format for the list view.
 * Shows progress, quantity information, due date, and customer details.
 *
 * @see specs/feature-production.md
 * @see specs/i18n-turkish-locale.md
 */

import { useMemo, type KeyboardEvent } from 'react';
import { useI18n } from '@org/shared-i18n';
import type { WorkOrderListItem } from '@org/shared-types';
import { Card, CardContent, Badge } from '@/components';
import { cn } from '@/lib/utils';
import { Calendar, Package, Factory, User, AlertTriangle } from 'lucide-react';

/**
 * Props for WorkOrderCard component
 */
export interface WorkOrderCardProps {
  /** Work order data */
  workOrder: WorkOrderListItem;
  /** Callback when card is clicked */
  onClick?: (docEntry: number) => void;
}

/**
 * Determines urgency level based on due date
 */
function getUrgencyLevel(dueDate: string): 'normal' | 'urgent' | 'overdue' {
  const due = new Date(dueDate);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Set times to start of day for accurate comparison
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);

  if (due < now) {
    return 'overdue';
  }
  if (due <= tomorrow) {
    return 'urgent';
  }
  return 'normal';
}

/**
 * WorkOrderCard displays a work order summary
 */
export function WorkOrderCard({
  workOrder,
  onClick,
}: WorkOrderCardProps): JSX.Element {
  const { formatDate, formatNumber } = useI18n();

  const urgencyLevel = useMemo(
    () => getUrgencyLevel(workOrder.dueDate),
    [workOrder.dueDate]
  );

  const handleClick = (): void => {
    onClick?.(workOrder.docEntry);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(workOrder.docEntry);
    }
  };

  const progressBarWidth = Math.min(100, Math.max(0, workOrder.progressPercent));

  return (
    <Card
      data-testid={`work-order-card-${workOrder.docEntry}`}
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/50',
        urgencyLevel === 'urgent' && 'border-destructive',
        urgencyLevel === 'overdue' && 'border-destructive bg-destructive/5'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`Is emri ${workOrder.docNum}: ${workOrder.prodName}`}
    >
      <CardContent className="p-4">
        {/* Header: Order number and machine badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">
                #{workOrder.docNum}
              </span>
              {urgencyLevel === 'overdue' && (
                <Badge variant="destructive" className="text-xs">
                  Gecikmis
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate">
              {workOrder.itemCode}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {workOrder.prodName}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {workOrder.machineName}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Ilerleme</span>
            <span className="font-medium">
              {formatNumber(workOrder.progressPercent, 1)}%
            </span>
          </div>
          <div
            className="h-2 bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={workOrder.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Ilerleme: ${formatNumber(workOrder.progressPercent, 1)}%`}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                workOrder.progressPercent >= 100
                  ? 'bg-success'
                  : workOrder.progressPercent >= 50
                    ? 'bg-primary'
                    : 'bg-warning'
              )}
              style={{ width: `${progressBarWidth}%` }}
            />
          </div>
        </div>

        {/* Quantity info */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Planlanan</div>
              <div className="font-medium">
                {formatNumber(workOrder.plannedQty, 0)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Kalan</div>
              <div className="font-medium">
                {formatNumber(workOrder.remainingQty, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Stock warning */}
        {workOrder.hasStockWarning && (
          <div
            className="flex items-center gap-2 mb-3 p-2 bg-warning/10 rounded-md text-warning-foreground border border-warning/30"
            data-testid="stock-warning"
          >
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span className="text-sm">Yetersiz hammadde stogu</span>
          </div>
        )}

        {/* Footer: Customer and due date */}
        <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">
              {workOrder.customerName ?? '-'}
            </span>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 shrink-0',
              urgencyLevel === 'urgent' && 'text-destructive',
              urgencyLevel === 'overdue' && 'text-destructive font-medium'
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>{formatDate(new Date(workOrder.dueDate))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WorkOrderCard;
