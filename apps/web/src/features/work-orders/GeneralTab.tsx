/**
 * GeneralTab Component
 *
 * Displays general information about a work order including:
 * - Quantities (planned, completed, rejected, remaining)
 * - Dates (start, due, release)
 * - Customer info
 * - Warehouse
 * - Progress bar
 * - Comments
 *
 * @see specs/feature-production.md
 */

import React from 'react';
import { useI18n } from '@org/shared-i18n';
import type { WorkOrderDetailResponse } from '@org/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';

export interface GeneralTabProps {
  /** Work order data */
  workOrder: WorkOrderDetailResponse;
}

/**
 * General Tab content for Work Order Detail
 */
export function GeneralTab({ workOrder }: GeneralTabProps): React.ReactElement {
  const { t, formatDate, formatNumber } = useI18n();

  // Calculate progress color based on percentage
  const getProgressColor = (percent: number): string => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 50) return 'bg-primary';
    return 'bg-amber-500';
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('workOrders.detail.quantity')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('workOrders.status.completed')}
              </span>
              <span className="font-medium">
                {formatNumber(workOrder.progressPercent, 1)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={workOrder.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${t('workOrders.status.completed')}: ${formatNumber(workOrder.progressPercent, 1)}%`}
              className="h-3 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={`h-full transition-all ${getProgressColor(workOrder.progressPercent)}`}
                style={{ width: `${Math.min(workOrder.progressPercent, 100)}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Quantities Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <QuantityItem
              label={t('workOrders.columns.plannedQty')}
              value={formatNumber(workOrder.plannedQty, 0)}
            />
            <QuantityItem
              label={t('workOrders.columns.completedQty')}
              value={formatNumber(workOrder.completedQty, 0)}
              variant="success"
            />
            <QuantityItem
              label={t('workOrders.columns.rejectedQty')}
              value={formatNumber(workOrder.rejectedQty, 0)}
              variant="destructive"
            />
            <QuantityItem
              label={t('workOrders.columns.remainingQty')}
              value={formatNumber(workOrder.remainingQty, 0)}
              variant="warning"
            />
          </div>
        </CardContent>
      </Card>

      {/* Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('workOrders.tabs.general')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem
              label={t('workOrders.columns.workOrderNo')}
              value={workOrder.docNum.toString()}
            />
            <DetailItem
              label={t('workOrders.columns.itemCode')}
              value={workOrder.itemCode}
            />
            <DetailItem
              label={t('workOrders.detail.startTime')}
              value={formatDate(new Date(workOrder.startDate))}
            />
            <DetailItem
              label={t('workOrders.detail.dueDate')}
              value={formatDate(new Date(workOrder.dueDate))}
            />
            {workOrder.releaseDate && (
              <DetailItem
                label={t('workOrders.status.released')}
                value={formatDate(new Date(workOrder.releaseDate))}
              />
            )}
            <DetailItem
              label={t('workOrders.detail.customer')}
              value={workOrder.customerName ?? '-'}
              testId="customer-value"
            />
            <DetailItem
              label={t('workOrders.detail.warehouse')}
              value={workOrder.warehouse}
            />
            {workOrder.sortOrder !== null && (
              <DetailItem
                label={t('workOrders.columns.sequence')}
                value={workOrder.sortOrder.toString()}
              />
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Comments Section */}
      {workOrder.comments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('workOrders.detail.notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {workOrder.comments}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Quantity display item with optional color variant
 */
interface QuantityItemProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'destructive' | 'warning';
}

function QuantityItem({
  label,
  value,
  variant = 'default',
}: QuantityItemProps): React.ReactElement {
  const variantClasses: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    destructive: 'text-destructive',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="space-y-1 text-center">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-xl font-semibold ${variantClasses[variant]}`}>{value}</dd>
    </div>
  );
}

/**
 * Detail item for key-value display
 */
interface DetailItemProps {
  label: string;
  value: string;
  testId?: string;
}

function DetailItem({ label, value, testId }: DetailItemProps): React.ReactElement {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className="text-sm font-medium"
        data-testid={testId}
      >
        {value}
      </dd>
    </div>
  );
}
