/**
 * ProductionEntryModal Component
 *
 * Modal for reporting accepted and rejected production quantities.
 * Validates quantities against remaining and shows confirmation for large entries.
 *
 * @see specs/feature-production.md
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useI18n } from '@org/shared-i18n';
import type { ProductionEntryResponse, WorkOrderDetailResponse } from '@org/shared-types';
import { useApiPost, useApiQueryClient } from '../../hooks/useApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Spinner } from '../../components';
import { AlertCircle, Package, CheckCircle } from 'lucide-react';

export interface ProductionEntryModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Work order details */
  workOrder: WorkOrderDetailResponse | null;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when entry is successful */
  onSuccess: () => void;
}

interface ProductionEntryRequest {
  acceptedQty: number;
  rejectedQty: number;
}

/**
 * ProductionEntryModal Component
 *
 * Allows workers to report production quantities for a work order.
 */
export function ProductionEntryModal({
  isOpen,
  workOrder,
  onClose,
  onSuccess,
}: ProductionEntryModalProps): React.ReactElement | null {
  const { t, formatNumber } = useI18n();
  const queryClient = useApiQueryClient();

  // Local state
  const [acceptedQty, setAcceptedQty] = useState<number | ''>('');
  const [rejectedQty, setRejectedQty] = useState<number | ''>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Production entry mutation
  const entryMutation = useApiPost<ProductionEntryResponse, ProductionEntryRequest>(
    `/work-orders/${workOrder?.docEntry}/production-entry`,
    {
      onSuccess: (data) => {
        setSubmitError(null);
        // Invalidate work order data to refresh
        // Note: Convert docEntry to string to match WorkOrderDetailPage's useParams-based query key
        queryClient.invalidateQueries({ queryKey: ['workOrder', String(workOrder?.docEntry)] });
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });
        onSuccess();
        onClose();
      },
      onError: (error) => {
        setSubmitError(error.message);
      },
    }
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAcceptedQty('');
      setRejectedQty('');
      setSubmitError(null);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  // Validation
  const validation = useMemo(() => {
    const accepted = typeof acceptedQty === 'number' ? acceptedQty : 0;
    const rejected = typeof rejectedQty === 'number' ? rejectedQty : 0;
    const remaining = workOrder?.remainingQty ?? 0;
    const total = accepted + rejected;

    const errors: string[] = [];

    if (accepted > remaining) {
      errors.push(t('production.validation.quantityExceedsRemaining'));
    }

    const isValid = total > 0 && accepted <= remaining && accepted >= 0 && rejected >= 0;
    const requiresConfirmation = accepted > remaining * 0.5;

    return {
      isValid,
      errors,
      requiresConfirmation,
      total,
    };
  }, [acceptedQty, rejectedQty, workOrder?.remainingQty, t]);

  // Handlers
  const handleAcceptedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '') {
        setAcceptedQty('');
      } else {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
          setAcceptedQty(num);
        }
      }
      setSubmitError(null);
    },
    []
  );

  const handleRejectedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '') {
        setRejectedQty('');
      } else {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
          setRejectedQty(num);
        }
      }
      setSubmitError(null);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!validation.isValid) return;

    const accepted = typeof acceptedQty === 'number' ? acceptedQty : 0;

    // Check if confirmation is needed
    if (validation.requiresConfirmation && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Submit
    setSubmitError(null);
    entryMutation.mutate({
      acceptedQty: accepted,
      rejectedQty: typeof rejectedQty === 'number' ? rejectedQty : 0,
    });
  }, [acceptedQty, rejectedQty, validation, showConfirmation, entryMutation]);

  const handleConfirm = useCallback(() => {
    setShowConfirmation(false);
    const accepted = typeof acceptedQty === 'number' ? acceptedQty : 0;
    const rejected = typeof rejectedQty === 'number' ? rejectedQty : 0;

    entryMutation.mutate({
      acceptedQty: accepted,
      rejectedQty: rejected,
    });
  }, [acceptedQty, rejectedQty, entryMutation]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Don't render if not open or no work order
  if (!isOpen || !workOrder) return null;

  // Confirmation dialog
  if (showConfirmation) {
    return (
      <Dialog open={true} onOpenChange={() => setShowConfirmation(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('common.confirm.title')}</DialogTitle>
            <DialogDescription>
              {t('production.validation.confirmLargeEntry')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelConfirmation}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handleConfirm}>
              {t('common.actions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md"
        aria-labelledby="production-entry-dialog-title"
        aria-describedby="production-entry-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="production-entry-dialog-title">
            {t('production.entry.title')}
          </DialogTitle>
          <DialogDescription id="production-entry-dialog-description">
            {t('workOrders.actions.productionEntry')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Work Order Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{workOrder.docNum}</div>
                <div className="text-sm text-muted-foreground">{workOrder.itemCode}</div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">
                    {t('workOrders.columns.remainingQty')}:{' '}
                  </span>
                  <span className="font-semibold">
                    {formatNumber(workOrder.remainingQty)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error alerts */}
          {submitError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {validation.errors.length > 0 && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertDescription>
                {validation.errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Quantity inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Accepted quantity */}
            <div className="space-y-2">
              <Label htmlFor="accepted-qty" className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                {t('production.entry.accept')}
              </Label>
              <Input
                id="accepted-qty"
                type="number"
                min="0"
                max={workOrder.remainingQty}
                value={acceptedQty}
                onChange={handleAcceptedChange}
                placeholder="0"
                className="text-lg"
                aria-label={t('production.entry.accept')}
              />
            </div>

            {/* Rejected quantity */}
            <div className="space-y-2">
              <Label htmlFor="rejected-qty" className="flex items-center gap-2">
                <AlertCircle className="size-4 text-red-600" />
                {t('production.entry.reject')}
              </Label>
              <Input
                id="rejected-qty"
                type="number"
                min="0"
                value={rejectedQty}
                onChange={handleRejectedChange}
                placeholder="0"
                className="text-lg"
                aria-label={t('production.entry.reject')}
              />
            </div>
          </div>

          {/* Total summary */}
          {validation.total > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <span className="text-sm text-muted-foreground">
                {t('workOrders.columns.plannedQty')}:{' '}
              </span>
              <span className="font-semibold">{formatNumber(validation.total)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={entryMutation.isPending}
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!validation.isValid || entryMutation.isPending}
          >
            {entryMutation.isPending && <Spinner size="sm" className="mr-2" />}
            {t('common.actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
