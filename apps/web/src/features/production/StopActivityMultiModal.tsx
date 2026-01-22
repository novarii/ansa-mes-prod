/**
 * StopActivityMultiModal Component
 *
 * Modal for selecting multiple employees and a break reason when stopping work.
 * Shows only employees with active state (BAS or DEV) on the work order.
 *
 * @see specs/feature-production.md
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useI18n } from '@org/shared-i18n';
import type {
  WorkerForSelection,
  ActivityActionMultiResponse,
  StopActivityMultiRequest,
  BreakReasonDto,
} from '@org/shared-types';
import { useApiQuery, useApiPost, useApiQueryClient } from '../../hooks/useApi';
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
import { Separator } from '../../components/ui/separator';
import { Spinner } from '../../components';
import { Search, AlertCircle, Check, Pause, Users } from 'lucide-react';

export interface StopActivityMultiModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Work order DocEntry */
  docEntry: number;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when stop action succeeds */
  onSuccess: () => void;
}

/**
 * StopActivityMultiModal Component
 *
 * Two-section modal:
 * 1. Employee selection (only active workers)
 * 2. Break reason selection (required)
 */
export function StopActivityMultiModal({
  isOpen,
  docEntry,
  onClose,
  onSuccess,
}: StopActivityMultiModalProps): React.ReactElement | null {
  const { t } = useI18n();
  const queryClient = useApiQueryClient();

  // Local state
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [breakSearchTerm, setBreakSearchTerm] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<number>>(new Set());
  const [selectedBreakCode, setSelectedBreakCode] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch active workers for this work order
  const {
    data: activeWorkers,
    isPending: workersLoading,
    error: workersError,
  } = useApiQuery<WorkerForSelection[]>(
    ['activeWorkers', docEntry],
    `/work-orders/${docEntry}/active-workers`,
    undefined,
    { enabled: isOpen }
  );

  // Fetch break reasons
  const {
    data: breakReasons,
    isPending: breakReasonsLoading,
    error: breakReasonsError,
  } = useApiQuery<BreakReasonDto[]>(['breakReasons'], '/break-reasons', undefined, {
    enabled: isOpen,
  });

  // Determine loading states
  const isLoading = (workersLoading || breakReasonsLoading) && isOpen;

  // Stop multi mutation
  const stopMutation = useApiPost<ActivityActionMultiResponse, StopActivityMultiRequest>(
    `/work-orders/${docEntry}/activity/stop-multi`,
    {
      onSuccess: async (data) => {
        setSubmitError(null);

        // Check if any failed
        const failures = data.results.filter((r) => !r.success);
        if (failures.length > 0) {
          const failureNames = failures.map((f) => f.empName).join(', ');
          setSubmitError(`Bazı çalışanlar durdurulamadı: ${failureNames}`);
          // Still refetch to update UI with partial success
          await queryClient.refetchQueries({ queryKey: ['activeWorkers', docEntry] });
          return;
        }

        // Force refetch before closing modal so UI updates immediately
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['activityState', docEntry] }),
          queryClient.refetchQueries({ queryKey: ['activeWorkers', docEntry] }),
        ]);

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
      setEmployeeSearchTerm('');
      setBreakSearchTerm('');
      setSelectedEmpIds(new Set());
      setSelectedBreakCode(null);
      setNotes('');
      setSubmitError(null);
    }
  }, [isOpen]);

  // Filter workers based on search
  const filteredWorkers = useMemo(() => {
    if (!activeWorkers) return [];
    if (!employeeSearchTerm.trim()) return activeWorkers;

    const lowerSearch = employeeSearchTerm.toLowerCase();
    return activeWorkers.filter(
      (worker) =>
        worker.firstName.toLowerCase().includes(lowerSearch) ||
        worker.lastName.toLowerCase().includes(lowerSearch) ||
        `${worker.firstName} ${worker.lastName}`.toLowerCase().includes(lowerSearch)
    );
  }, [activeWorkers, employeeSearchTerm]);

  // Filter break reasons based on search
  const filteredBreakReasons = useMemo(() => {
    if (!breakReasons) return [];
    if (!breakSearchTerm.trim()) return breakReasons;

    const lowerSearch = breakSearchTerm.toLowerCase();
    return breakReasons.filter(
      (reason) =>
        reason.name.toLowerCase().includes(lowerSearch) ||
        reason.code.toLowerCase().includes(lowerSearch)
    );
  }, [breakReasons, breakSearchTerm]);

  // Handlers
  const handleEmployeeSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmployeeSearchTerm(e.target.value);
    },
    []
  );

  const handleBreakSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBreakSearchTerm(e.target.value);
    },
    []
  );

  const handleWorkerToggle = useCallback((empId: number) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
    setSubmitError(null);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!filteredWorkers) return;

    const allSelected = filteredWorkers.every((w) => selectedEmpIds.has(w.empID));
    if (allSelected) {
      setSelectedEmpIds((prev) => {
        const next = new Set(prev);
        filteredWorkers.forEach((w) => next.delete(w.empID));
        return next;
      });
    } else {
      setSelectedEmpIds((prev) => {
        const next = new Set(prev);
        filteredWorkers.forEach((w) => next.add(w.empID));
        return next;
      });
    }
  }, [filteredWorkers, selectedEmpIds]);

  const handleBreakReasonSelect = useCallback((code: string) => {
    setSelectedBreakCode(code);
    setSubmitError(null);
  }, []);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (selectedEmpIds.size === 0 || !selectedBreakCode) return;
    setSubmitError(null);
    stopMutation.mutate({
      empIds: Array.from(selectedEmpIds),
      breakCode: selectedBreakCode,
      notes: notes.trim() || undefined,
    });
  }, [selectedEmpIds, selectedBreakCode, notes, stopMutation]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Check if all filtered workers are selected
  const allFilteredSelected = useMemo(() => {
    if (!filteredWorkers || filteredWorkers.length === 0) return false;
    return filteredWorkers.every((w) => selectedEmpIds.has(w.empID));
  }, [filteredWorkers, selectedEmpIds]);

  // Don't render if not open
  if (!isOpen) return null;

  const hasNoActiveWorkers = !isLoading && activeWorkers && activeWorkers.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg"
        aria-labelledby="stop-activity-dialog-title"
        aria-describedby="stop-activity-dialog-description"
      >
        <DialogHeader>
          <DialogTitle
            id="stop-activity-dialog-title"
            className="flex items-center gap-2"
          >
            <Pause className="size-5 text-orange-500" />
            {t('production.employeeSelect.stopTitle')}
          </DialogTitle>
          <DialogDescription id="stop-activity-dialog-description">
            {t('production.employeeSelect.stopDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error alerts */}
          {(workersError || breakReasonsError) && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertDescription>
                {workersError?.message || breakReasonsError?.message}
              </AlertDescription>
            </Alert>
          )}

          {submitError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div
              data-testid="stop-modal-loading"
              className="flex items-center justify-center py-8"
            >
              <Spinner />
            </div>
          ) : hasNoActiveWorkers ? (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                {t('production.employeeSelect.noActiveWorkers')}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Section 1: Employee Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t('production.employeeSelect.title')}
                </Label>

                {/* Search employees */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('production.employeeSelect.searchPlaceholder')}
                    value={employeeSearchTerm}
                    onChange={handleEmployeeSearchChange}
                    className="pl-9"
                  />
                </div>

                {/* Select All */}
                {filteredWorkers.length > 0 && (
                  <div
                    className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-2 transition-colors hover:bg-muted/50"
                    onClick={handleSelectAll}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectAll();
                      }
                    }}
                    role="checkbox"
                    aria-checked={allFilteredSelected}
                    tabIndex={0}
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded border-2 transition-colors ${
                        allFilteredSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {allFilteredSelected && <Check className="size-3" />}
                    </div>
                    <span className="font-medium">
                      {t('production.employeeSelect.selectAll')}
                    </span>
                  </div>
                )}

                {/* Worker list */}
                <div
                  className="max-h-40 overflow-y-auto rounded-md border"
                  role="listbox"
                  aria-multiselectable="true"
                >
                  {filteredWorkers.length === 0 ? (
                    <div className="px-4 py-6 text-center text-muted-foreground">
                      {t('common.status.noData')}
                    </div>
                  ) : (
                    filteredWorkers.map((worker) => {
                      const isSelected = selectedEmpIds.has(worker.empID);
                      const fullName = `${worker.firstName} ${worker.lastName}`;

                      return (
                        <div
                          key={worker.empID}
                          data-testid={`stop-worker-item-${worker.empID}`}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={0}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => handleWorkerToggle(worker.empID)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleWorkerToggle(worker.empID);
                            }
                          }}
                        >
                          <div
                            className={`flex size-5 items-center justify-center rounded border-2 transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {isSelected && <Check className="size-3" />}
                          </div>
                          <span className={isSelected ? 'font-medium text-primary' : ''}>
                            {fullName}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected count */}
                {selectedEmpIds.size > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    {t('production.employeeSelect.selected', { count: selectedEmpIds.size })}
                  </div>
                )}
              </div>

              <Separator />

              {/* Section 2: Break Reason Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t('production.breakReason.title')}
                </Label>

                {/* Search break reasons */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('common.actions.search')}
                    value={breakSearchTerm}
                    onChange={handleBreakSearchChange}
                    className="pl-9"
                  />
                </div>

                {/* Break reason list */}
                <div
                  className="max-h-40 overflow-y-auto rounded-md border"
                  role="listbox"
                  aria-label={t('production.breakReason.listLabel')}
                >
                  {filteredBreakReasons.length === 0 ? (
                    <div className="px-4 py-6 text-center text-muted-foreground">
                      {t('common.status.noData')}
                    </div>
                  ) : (
                    filteredBreakReasons.map((reason) => (
                      <div
                        key={reason.code}
                        data-testid={`break-reason-item-${reason.code}`}
                        role="option"
                        aria-selected={selectedBreakCode === reason.code}
                        tabIndex={0}
                        className={`flex cursor-pointer items-center justify-between px-4 py-2 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none ${
                          selectedBreakCode === reason.code
                            ? 'bg-primary/10 text-primary'
                            : ''
                        }`}
                        onClick={() => handleBreakReasonSelect(reason.code)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleBreakReasonSelect(reason.code);
                          }
                        }}
                      >
                        <span>{reason.name}</span>
                        {selectedBreakCode === reason.code && (
                          <Check className="size-4 text-primary" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notes textarea */}
              <div className="space-y-2">
                <Label htmlFor="stop-notes">{t('production.breakReason.notes')}</Label>
                <textarea
                  id="stop-notes"
                  aria-label={t('production.breakReason.notes')}
                  placeholder={t('production.breakReason.notesPlaceholder')}
                  value={notes}
                  onChange={handleNotesChange}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={stopMutation.isPending}
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              selectedEmpIds.size === 0 ||
              !selectedBreakCode ||
              stopMutation.isPending ||
              hasNoActiveWorkers
            }
            className="bg-orange-500 hover:bg-orange-600"
          >
            {stopMutation.isPending && <Spinner size="sm" className="mr-2" />}
            <Pause className="mr-2 size-4" />
            {t('workOrders.actions.stop')} ({selectedEmpIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
