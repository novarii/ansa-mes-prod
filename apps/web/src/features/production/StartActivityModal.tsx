/**
 * StartActivityModal Component
 *
 * Modal for selecting multiple employees when starting work on a work order.
 * Fetches authorized workers for the machine and allows multi-selection.
 *
 * @see specs/feature-production.md
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useI18n } from '@org/shared-i18n';
import type {
  WorkerForSelection,
  ActivityActionMultiResponse,
  StartActivityMultiRequest,
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
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Spinner } from '../../components';
import { Search, AlertCircle, Check, Play, Users } from 'lucide-react';

export interface StartActivityModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Work order DocEntry */
  docEntry: number;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when start action succeeds */
  onSuccess: () => void;
}

/**
 * StartActivityModal Component
 *
 * Displays a searchable list of authorized workers with checkboxes
 * for multi-selection before starting work.
 */
export function StartActivityModal({
  isOpen,
  docEntry,
  onClose,
  onSuccess,
}: StartActivityModalProps): React.ReactElement | null {
  const { t } = useI18n();
  const queryClient = useApiQueryClient();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<number>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch authorized workers for machine
  const {
    data: workers,
    isPending,
    error: fetchError,
  } = useApiQuery<WorkerForSelection[]>(['workers'], '/workers', undefined, {
    enabled: isOpen,
  });

  // Determine loading state
  const isLoading = isPending && isOpen;

  // Start multi mutation
  const startMutation = useApiPost<ActivityActionMultiResponse, StartActivityMultiRequest>(
    `/work-orders/${docEntry}/activity/start-multi`,
    {
      onSuccess: async (data) => {
        setSubmitError(null);

        // Check if any failed
        const failures = data.results.filter((r) => !r.success);
        if (failures.length > 0) {
          const failureNames = failures.map((f) => f.empName).join(', ');
          setSubmitError(`Bazı çalışanlar başlatılamadı: ${failureNames}`);
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
      setSearchTerm('');
      setSelectedEmpIds(new Set());
      setSubmitError(null);
    }
  }, [isOpen]);

  // Filter workers based on search
  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    if (!searchTerm.trim()) return workers;

    const lowerSearch = searchTerm.toLowerCase();
    return workers.filter(
      (worker) =>
        worker.firstName.toLowerCase().includes(lowerSearch) ||
        worker.lastName.toLowerCase().includes(lowerSearch) ||
        `${worker.firstName} ${worker.lastName}`.toLowerCase().includes(lowerSearch)
    );
  }, [workers, searchTerm]);

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
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
      // Deselect all filtered workers
      setSelectedEmpIds((prev) => {
        const next = new Set(prev);
        filteredWorkers.forEach((w) => next.delete(w.empID));
        return next;
      });
    } else {
      // Select all filtered workers
      setSelectedEmpIds((prev) => {
        const next = new Set(prev);
        filteredWorkers.forEach((w) => next.add(w.empID));
        return next;
      });
    }
  }, [filteredWorkers, selectedEmpIds]);

  const handleSubmit = useCallback(() => {
    if (selectedEmpIds.size === 0) return;
    setSubmitError(null);
    startMutation.mutate({
      empIds: Array.from(selectedEmpIds),
    });
  }, [selectedEmpIds, startMutation]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md"
        aria-labelledby="start-activity-dialog-title"
        aria-describedby="start-activity-dialog-description"
      >
        <DialogHeader>
          <DialogTitle
            id="start-activity-dialog-title"
            className="flex items-center gap-2"
          >
            <Play className="size-5 text-green-600" />
            {t('production.employeeSelect.startTitle')}
          </DialogTitle>
          <DialogDescription id="start-activity-dialog-description">
            {t('production.employeeSelect.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('production.employeeSelect.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>

          {/* Error alerts */}
          {fetchError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertDescription>{fetchError.message}</AlertDescription>
            </Alert>
          )}

          {submitError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Worker list */}
          {isLoading ? (
            <div
              data-testid="workers-loading"
              className="flex items-center justify-center py-8"
            >
              <Spinner />
            </div>
          ) : (
            <>
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
                className="max-h-60 overflow-y-auto rounded-md border"
                role="listbox"
                aria-label={t('production.employeeSelect.listLabel')}
                aria-multiselectable="true"
              >
                {filteredWorkers.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    {t('common.status.noData')}
                  </div>
                ) : (
                  filteredWorkers.map((worker) => {
                    const isSelected = selectedEmpIds.has(worker.empID);
                    const fullName = `${worker.firstName} ${worker.lastName}`;

                    return (
                      <div
                        key={worker.empID}
                        data-testid={`worker-item-${worker.empID}`}
                        data-selected={isSelected ? 'true' : 'false'}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none ${
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
                        {/* Checkbox */}
                        <div
                          className={`flex size-5 items-center justify-center rounded border-2 transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>

                        {/* Worker info */}
                        <div className="flex flex-1 items-center justify-between">
                          <span className={isSelected ? 'font-medium text-primary' : ''}>
                            {fullName}
                          </span>
                          {worker.IsDefault && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              Varsayılan
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Selected count */}
          {selectedEmpIds.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              {t('production.employeeSelect.selected', { count: selectedEmpIds.size })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={startMutation.isPending}
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selectedEmpIds.size === 0 || startMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {startMutation.isPending && <Spinner size="sm" className="mr-2" />}
            <Play className="mr-2 size-4" />
            {t('workOrders.actions.start')} ({selectedEmpIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
