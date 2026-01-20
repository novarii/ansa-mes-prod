/**
 * BreakReasonModal Component
 *
 * Modal for selecting a break reason when stopping (DUR) work on a work order.
 * CRITICAL: Always store the break reason code, NOT the name/description.
 *
 * @see specs/feature-production.md
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useI18n } from '@org/shared-i18n';
import type { BreakReasonDto, ActivityActionResponse, ActivityStateResponse } from '@org/shared-types';
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
import { Spinner } from '../../components';
import { Search, AlertCircle, Check } from 'lucide-react';

export interface BreakReasonModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Work order DocEntry */
  docEntry: number;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when stop action succeeds */
  onSuccess: () => void;
}

interface StopActivityRequest {
  breakCode: string;
  notes: string;
}

/**
 * BreakReasonModal Component
 *
 * Displays a searchable list of break reasons and allows the user to
 * select one and optionally add notes before stopping their work.
 */
export function BreakReasonModal({
  isOpen,
  docEntry,
  onClose,
  onSuccess,
}: BreakReasonModalProps): React.ReactElement | null {
  const { t } = useI18n();
  const queryClient = useApiQueryClient();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch break reasons
  const {
    data: breakReasons,
    isPending,
    error: fetchError,
  } = useApiQuery<BreakReasonDto[]>(['breakReasons'], '/break-reasons', undefined, {
    enabled: isOpen,
  });

  // Determine loading state (isPending is true when no cached data exists)
  const isLoading = isPending && isOpen;

  // Stop mutation
  const stopMutation = useApiPost<ActivityActionResponse, StopActivityRequest>(
    `/work-orders/${docEntry}/activity/stop`,
    {
      onSuccess: (data) => {
        setSubmitError(null);
        // Update activity state in cache (preserve empId from existing data)
        queryClient.setQueryData<ActivityStateResponse | undefined>(
          ['activityState', docEntry],
          (oldData) => oldData ? { ...oldData, state: data.state } : undefined
        );
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
      setSelectedCode(null);
      setNotes('');
      setSubmitError(null);
    }
  }, [isOpen]);

  // Filter break reasons based on search
  const filteredReasons = useMemo(() => {
    if (!breakReasons) return [];
    if (!searchTerm.trim()) return breakReasons;

    const lowerSearch = searchTerm.toLowerCase();
    return breakReasons.filter(
      (reason) =>
        reason.name.toLowerCase().includes(lowerSearch) ||
        reason.code.toLowerCase().includes(lowerSearch)
    );
  }, [breakReasons, searchTerm]);

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  );

  const handleReasonSelect = useCallback((code: string) => {
    setSelectedCode(code);
    setSubmitError(null);
  }, []);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!selectedCode) return;
    setSubmitError(null);
    stopMutation.mutate({
      breakCode: selectedCode,
      notes: notes.trim(),
    });
  }, [selectedCode, notes, stopMutation]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md"
        aria-labelledby="break-reason-dialog-title"
        aria-describedby="break-reason-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="break-reason-dialog-title">
            {t('production.breakReason.title')}
          </DialogTitle>
          <DialogDescription id="break-reason-dialog-description">
            {t('production.breakReason.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('common.actions.search')}
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

          {/* Break reason list */}
          {isLoading ? (
            <div
              data-testid="break-reasons-loading"
              className="flex items-center justify-center py-8"
            >
              <Spinner />
            </div>
          ) : (
            <div
              className="max-h-60 overflow-y-auto rounded-md border"
              role="listbox"
              aria-label={t('production.breakReason.listLabel')}
            >
              {filteredReasons.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  {t('common.status.noData')} - {t('production.breakReason.noResults')}
                </div>
              ) : (
                filteredReasons.map((reason) => (
                  <div
                    key={reason.code}
                    data-testid={`break-reason-item-${reason.code}`}
                    data-selected={selectedCode === reason.code ? 'true' : 'false'}
                    role="option"
                    aria-selected={selectedCode === reason.code}
                    tabIndex={0}
                    className={`flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none ${
                      selectedCode === reason.code
                        ? 'bg-primary/10 text-primary'
                        : ''
                    }`}
                    onClick={() => handleReasonSelect(reason.code)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleReasonSelect(reason.code);
                      }
                    }}
                  >
                    <span>{reason.name}</span>
                    {selectedCode === reason.code && (
                      <Check className="size-4 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Notes textarea */}
          <div className="space-y-2">
            <Label htmlFor="break-notes">{t('production.breakReason.notes')}</Label>
            <textarea
              id="break-notes"
              aria-label={t('production.breakReason.notes')}
              placeholder={t('production.breakReason.notesPlaceholder')}
              value={notes}
              onChange={handleNotesChange}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>
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
            disabled={!selectedCode || stopMutation.isPending}
          >
            {stopMutation.isPending && <Spinner size="sm" className="mr-2" />}
            {t('common.actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
