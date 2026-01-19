/**
 * ActivityButtons Component
 *
 * Displays activity control buttons (Start/Stop/Resume/Finish) based on
 * the current worker's activity state on a work order.
 *
 * State transitions:
 * - No state / BIT: Can Start (BAS)
 * - BAS / DEV: Can Stop (DUR) or Finish (BIT)
 * - DUR: Can Resume (DEV) or Finish (BIT)
 *
 * @see specs/feature-production.md
 */

import React, { useState, useCallback } from 'react';
import { useI18n } from '@org/shared-i18n';
import type {
  ActivityStateResponse,
  ActivityActionResponse,
  WorkerActivityState,
} from '@org/shared-types';
import { useApiQuery, useApiPost, useApiQueryClient } from '../../hooks/useApi';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Spinner } from '../../components';
import { Play, Pause, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

export interface ActivityButtonsProps {
  /** Work order DocEntry */
  docEntry: number;
  /** Callback when stop action requires break reason selection */
  onBreakReasonRequired: () => void;
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
  onBreakReasonRequired,
  onStateChange,
}: ActivityButtonsProps): React.ReactElement {
  const { t } = useI18n();
  const queryClient = useApiQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch current activity state
  const {
    data: stateResponse,
    isLoading,
    error: fetchError,
  } = useApiQuery<ActivityStateResponse>(
    ['activityState', docEntry],
    `/work-orders/${docEntry}/activity-state`
  );

  // Mutation for start action
  const startMutation = useApiPost<ActivityActionResponse, Record<string, never>>(
    `/work-orders/${docEntry}/activity/start`,
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
        queryClient.invalidateQueries({ queryKey: ['workOrder', docEntry] });
      },
      onError: (error) => {
        setActionError(error.message);
      },
    }
  );

  // Action handlers
  const handleStart = useCallback(() => {
    setActionError(null);
    startMutation.mutate({});
  }, [startMutation]);

  const handleStop = useCallback(() => {
    // Stop requires break reason selection via modal
    onBreakReasonRequired();
  }, [onBreakReasonRequired]);

  const handleResume = useCallback(() => {
    setActionError(null);
    resumeMutation.mutate({});
  }, [resumeMutation]);

  const handleFinish = useCallback(() => {
    setActionError(null);
    finishMutation.mutate({});
  }, [finishMutation]);

  // Determine if any action is in progress
  const isActionPending =
    startMutation.isPending || resumeMutation.isPending || finishMutation.isPending;

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
        {/* Start button - green */}
        {state.canStart && (
          <Button
            variant="default"
            onClick={handleStart}
            disabled={isActionPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {startMutation.isPending ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            {t('workOrders.actions.start')}
          </Button>
        )}

        {/* Stop button - orange */}
        {state.canStop && (
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

      {/* Current state indicator */}
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
