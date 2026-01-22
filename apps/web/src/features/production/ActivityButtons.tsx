/**
 * ActivityButtons Component
 *
 * Displays activity control buttons (Start/Stop/Resume/Finish) based on
 * both the current worker's state AND overall work order activity.
 *
 * Button visibility:
 * - Start: Always visible (can always start more workers)
 * - Stop: Visible if there are ANY active workers on the work order
 * - Resume: Visible if current user is paused (DUR)
 * - Finish: Visible if current user has active or paused state
 *
 * @see specs/feature-production.md
 */

import React, { useState, useCallback } from 'react';
import { useI18n } from '@org/shared-i18n';
import type {
  ActivityStateResponse,
  ActivityActionResponse,
  WorkerActivityState,
  WorkerForSelection,
} from '@org/shared-types';
import { useApiQuery, useApiPost, useApiQueryClient } from '../../hooks/useApi';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Spinner } from '../../components';
import { Play, Pause, RotateCcw, CheckCircle, AlertCircle, Users } from 'lucide-react';

export interface ActivityButtonsProps {
  /** Work order DocEntry */
  docEntry: number;
  /** Callback when start action requires employee selection */
  onStartEmployeesRequired: () => void;
  /** Callback when stop action requires employee and break reason selection */
  onStopEmployeesRequired: () => void;
  /** Optional callback when activity state changes */
  onStateChange?: (state: WorkerActivityState) => void;
}

/**
 * ActivityButtons Component
 *
 * Fetches current activity state and renders appropriate action buttons.
 */
export function ActivityButtons({
  docEntry,
  onStartEmployeesRequired,
  onStopEmployeesRequired,
  onStateChange,
}: ActivityButtonsProps): React.ReactElement {
  const { t } = useI18n();
  const queryClient = useApiQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch current activity state (for current user's Resume/Finish buttons)
  const {
    data: stateResponse,
    isLoading: isStateLoading,
    error: fetchError,
  } = useApiQuery<ActivityStateResponse>(
    ['activityState', docEntry],
    `/work-orders/${docEntry}/activity-state`
  );

  // Fetch active workers (for Stop button visibility)
  const {
    data: activeWorkers,
    isLoading: isWorkersLoading,
  } = useApiQuery<WorkerForSelection[]>(
    ['activeWorkers', docEntry],
    `/work-orders/${docEntry}/active-workers`
  );

  const isLoading = isStateLoading || isWorkersLoading;
  const hasActiveWorkers = (activeWorkers?.length ?? 0) > 0;

  // Mutation for resume action
  const resumeMutation = useApiPost<ActivityActionResponse, Record<string, never>>(
    `/work-orders/${docEntry}/activity/resume`,
    {
      onSuccess: (data) => {
        setActionError(null);
        queryClient.setQueryData(['activityState', docEntry], {
          state: data.state,
          docEntry,
          empId: stateResponse?.empId,
        });
        onStateChange?.(data.state);
      },
      onError: (error) => {
        setActionError(error.message);
      },
    }
  );

  // Mutation for finish action
  const finishMutation = useApiPost<ActivityActionResponse, Record<string, never>>(
    `/work-orders/${docEntry}/activity/finish`,
    {
      onSuccess: (data) => {
        setActionError(null);
        queryClient.setQueryData(['activityState', docEntry], {
          state: data.state,
          docEntry,
          empId: stateResponse?.empId,
        });
        onStateChange?.(data.state);
        // Also invalidate work order data since finish might affect it
        // Note: Convert docEntry to string to match WorkOrderDetailPage's useParams-based query key
        queryClient.invalidateQueries({ queryKey: ['workOrder', String(docEntry)] });
      },
      onError: (error) => {
        setActionError(error.message);
      },
    }
  );

  // Action handlers
  const handleStart = useCallback(() => {
    // Start requires employee selection via modal
    onStartEmployeesRequired();
  }, [onStartEmployeesRequired]);

  const handleStop = useCallback(() => {
    // Stop requires employee and break reason selection via modal
    onStopEmployeesRequired();
  }, [onStopEmployeesRequired]);

  const handleResume = useCallback(() => {
    setActionError(null);
    resumeMutation.mutate({});
  }, [resumeMutation]);

  const handleFinish = useCallback(() => {
    setActionError(null);
    finishMutation.mutate({});
  }, [finishMutation]);

  // Determine if any action is in progress
  const isActionPending = resumeMutation.isPending || finishMutation.isPending;

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="activity-buttons-loading"
        aria-busy="true"
        className="flex items-center justify-center py-4"
      >
        <Spinner size="sm" />
      </div>
    );
  }

  // Fetch error state
  if (fetchError) {
    return (
      <Alert variant="destructive" data-testid="activity-buttons-error">
        <AlertCircle className="size-4" />
        <AlertDescription>
          {fetchError.message || t('common.status.error')}
        </AlertDescription>
      </Alert>
    );
  }

  const state = stateResponse?.state;

  // No state (shouldn't happen but TypeScript requires)
  if (!state) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{t('common.status.error')}</AlertDescription>
      </Alert>
    );
  }

  // Button visibility logic:
  // - Start: Always available (can start more workers)
  // - Stop: Show if there are ANY active workers (not just current user)
  // - Resume: Current user's personal state
  // - Finish: Current user's personal state
  const canShowStart = true; // Always allow starting more workers
  const canShowStop = hasActiveWorkers; // Show if any workers are active

  return (
    <div className="space-y-3" data-testid="activity-buttons">
      {/* Action error alert */}
      {actionError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Button group */}
      <div className="flex flex-wrap gap-2">
        {/* Start button - green (opens employee selection modal) */}
        {canShowStart && (
          <Button
            variant="default"
            onClick={handleStart}
            disabled={isActionPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="mr-2 size-4" />
            {t('workOrders.actions.start')}
          </Button>
        )}

        {/* Stop button - orange (visible if ANY workers are active) */}
        {canShowStop && (
          <Button
            variant="default"
            onClick={handleStop}
            disabled={isActionPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Pause className="mr-2 size-4" />
            {t('workOrders.actions.stop')}
          </Button>
        )}

        {/* Resume button - green */}
        {state.canResume && (
          <Button
            variant="default"
            onClick={handleResume}
            disabled={isActionPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {resumeMutation.isPending ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <RotateCcw className="mr-2 size-4" />
            )}
            {t('workOrders.actions.continue')}
          </Button>
        )}

        {/* Finish button - red */}
        {state.canFinish && (
          <Button
            variant="destructive"
            onClick={handleFinish}
            disabled={isActionPending}
          >
            {finishMutation.isPending ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <CheckCircle className="mr-2 size-4" />
            )}
            {t('workOrders.actions.finish')}
          </Button>
        )}
      </div>

      {/* Active workers indicator */}
      {hasActiveWorkers && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Users className="size-4" />
          <span className="font-medium">
            {t('production.employeeSelect.activeWorkers', { count: activeWorkers?.length ?? 0 })}
          </span>
        </div>
      )}

      {/* Current user state indicator */}
      {state.processType && (
        <div className="text-sm text-muted-foreground">
          {t('production.activity.currentState')}:{' '}
          <span className="font-medium">
            {state.processType === 'BAS' && t('production.activity.started')}
            {state.processType === 'DUR' && t('production.activity.stopped')}
            {state.processType === 'DEV' && t('production.activity.resumed')}
            {state.processType === 'BIT' && t('production.activity.finished')}
          </span>
        </div>
      )}
    </div>
  );
}
