/**
 * Team Page
 *
 * Displays machines with their workers organized by status (assigned, paused, available).
 * Supports shift filtering to show workers for specific shifts.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@org/shared-i18n';
import { useApiQuery } from '../../hooks/useApi';
import type {
  TeamViewResponse,
  ShiftListResponse,
  ShiftCode,
} from '@org/shared-types';
import {
  Layout,
  PageHeader,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  AlertDescription,
  Spinner,
  Badge,
} from '@/components';
import { MachineCard } from './MachineCard';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';

/**
 * Shift filter options type
 */
type ShiftFilter = ShiftCode | 'all';

/**
 * Team Page Component
 */
export function TeamPage(): JSX.Element {
  const { t } = useI18n();

  // Shift filter state - default to 'all'
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (shiftFilter !== 'all') {
      params.shift = shiftFilter;
    }
    return params;
  }, [shiftFilter]);

  // Fetch team data
  const {
    data: teamResponse,
    isLoading: isLoadingTeam,
    error: teamError,
    refetch: refetchTeam,
    isFetching,
  } = useApiQuery<TeamViewResponse>(['team', queryParams], '/team', queryParams);

  // Fetch shift definitions
  const { data: shiftsData } = useApiQuery<ShiftListResponse>(
    ['teamShifts'],
    '/team/shifts'
  );

  // Handle shift filter change
  const handleShiftChange = useCallback((value: string) => {
    setShiftFilter(value as ShiftFilter);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchTeam();
  }, [refetchTeam]);

  const machines = teamResponse?.machines ?? [];
  const currentShift = teamResponse?.currentShift ?? shiftsData?.currentShift;
  const shifts = shiftsData?.shifts ?? [];

  // Get current shift display name
  const currentShiftName = useMemo(() => {
    if (!currentShift || !shifts.length) return null;
    const shift = shifts.find((s) => s.code === currentShift);
    return shift?.name ?? `${currentShift} Vardiyasi`;
  }, [currentShift, shifts]);

  return (
    <Layout>
      <div data-testid="team-page">
        <PageHeader
          title={t('team.title') || 'Uretim Bandi Calisanlari'}
          subtitle={
            currentShiftName ? (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {t('team.currentShift') || 'Mevcut Vardiya'}: {currentShiftName}
              </span>
            ) : undefined
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              aria-label={t('common.actions.refresh') || 'Yenile'}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
              />
              {t('common.actions.refresh') || 'Yenile'}
            </Button>
          }
        />

        {/* Filters Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Shift Filter */}
            <div className="w-full sm:w-64">
              <Select value={shiftFilter} onValueChange={handleShiftChange}>
                <SelectTrigger aria-label={t('team.shiftFilter') || 'Vardiya Filtresi'}>
                  <SelectValue
                    placeholder={t('team.selectShift') || 'Vardiya Sec'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('common.all') || 'Tumu'}
                  </SelectItem>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.code} value={shift.code}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current shift badge */}
            {currentShift && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('team.currentShift') || 'Mevcut'}: {currentShift}
              </Badge>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoadingTeam && (
          <div
            className="flex flex-col items-center justify-center py-12"
            data-testid="team-page-loading"
            aria-busy="true"
            aria-label={t('common.status.loading') || 'Yukleniyor'}
          >
            <Spinner size="lg" />
            <p className="mt-4 text-muted-foreground">
              {t('common.status.loading') || 'Yukleniyor...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {teamError && !isLoadingTeam && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{teamError.message}</AlertDescription>
          </Alert>
        )}

        {/* Team View Content */}
        {!isLoadingTeam && !teamError && (
          <>
            {/* Results summary */}
            <div className="mb-4 text-sm text-muted-foreground">
              {machines.length > 0 ? (
                <span>
                  {machines.length} {t('team.machineCount') || 'makine'}
                </span>
              ) : null}
            </div>

            {/* Empty State */}
            {machines.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {t('team.noMachines') || 'Makine bulunamadi'}
                </p>
              </div>
            )}

            {/* Machine Cards Grid */}
            {machines.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {machines.map((machine) => (
                  <MachineCard key={machine.machineCode} machine={machine} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default TeamPage;
