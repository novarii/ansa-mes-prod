/**
 * Calendar Page
 *
 * Displays work orders in a calendar view with month/week/day views.
 * Supports filtering by station and status, with full Turkish localization.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useI18n } from '@org/shared-i18n';
import { useApiQuery } from '../../hooks/useApi';
import type {
  CalendarViewResponse,
  CalendarStationsResponse,
  CalendarEvent,
  CalendarViewMode,
  WorkOrderStatusCode,
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
} from '@/components';
import { CalendarEventCard } from './CalendarEventCard';
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

// Import react-big-calendar styles
import 'react-big-calendar/lib/css/react-big-calendar.css';

/**
 * Configure date-fns localizer for react-big-calendar with Turkish locale
 */
const locales = { 'tr-TR': tr };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday start
  getDay,
  locales,
});

/**
 * Turkish month names
 */
const TURKISH_MONTHS = [
  'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik',
];

/**
 * Turkish day names (short)
 */
const TURKISH_DAYS_SHORT = ['Paz', 'Pts', 'Sal', 'Car', 'Per', 'Cum', 'Cts'];

/**
 * Status filter options
 */
type StatusFilter = WorkOrderStatusCode | 'all';

/**
 * Status filter configuration
 */
const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'R', label: 'Aktif' },
  { value: 'P', label: 'Planlanan' },
  { value: 'L', label: 'Tamamlanan' },
  { value: 'all', label: 'Tumu' },
];

/**
 * View mode to react-big-calendar view mapping
 */
const VIEW_MODES: Array<{ value: CalendarViewMode; label: string; rbcView: View }> = [
  { value: 'month', label: 'Ay', rbcView: 'month' },
  { value: 'week', label: 'Hafta', rbcView: 'week' },
  { value: 'day', label: 'Gun', rbcView: 'day' },
];

/**
 * Calendar Page Component
 */
export function CalendarPage(): JSX.Element {
  const { t } = useI18n();
  const navigate = useNavigate();

  // State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('R');

  // Calculate date range for API query
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    // Extend range to include events that span into/out of the month
    const extendedStart = subMonths(start, 1);
    const extendedEnd = addMonths(end, 1);
    return {
      startDate: format(extendedStart, 'yyyy-MM-dd'),
      endDate: format(extendedEnd, 'yyyy-MM-dd'),
    };
  }, [currentDate]);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };
    if (stationFilter !== 'all') {
      params.stationCode = stationFilter;
    }
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    return params;
  }, [dateRange, stationFilter, statusFilter]);

  // Fetch calendar events
  const {
    data: calendarResponse,
    isLoading: isLoadingCalendar,
    error: calendarError,
    refetch: refetchCalendar,
    isFetching,
  } = useApiQuery<CalendarViewResponse>(
    ['calendar', queryParams],
    '/calendar',
    queryParams
  );

  // Fetch stations for filter dropdown
  const { data: stationsData } = useApiQuery<CalendarStationsResponse>(
    ['calendarStations'],
    '/calendar/stations'
  );

  // Transform events for react-big-calendar
  const calendarEvents = useMemo(() => {
    if (!calendarResponse?.events) return [];
    return calendarResponse.events.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
      resource: event,
    }));
  }, [calendarResponse?.events]);

  const stations = stationsData?.stations ?? [];

  // Handlers
  const handleViewModeChange = useCallback((mode: CalendarViewMode) => {
    setViewMode(mode);
  }, []);

  const handleStationChange = useCallback((value: string) => {
    setStationFilter(value);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value as StatusFilter);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchCalendar();
  }, [refetchCalendar]);

  const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    switch (action) {
      case 'PREV':
        setCurrentDate((prev) => subMonths(prev, 1));
        break;
      case 'NEXT':
        setCurrentDate((prev) => addMonths(prev, 1));
        break;
      case 'TODAY':
        setCurrentDate(new Date());
        break;
    }
  }, []);

  const handleEventClick = useCallback(
    (event: { resource: CalendarEvent }) => {
      navigate(`/work-orders/${event.resource.id}`);
    },
    [navigate]
  );

  const handleRBCNavigate = useCallback((date: Date, view: View, action: NavigateAction) => {
    setCurrentDate(date);
  }, []);

  const handleRBCViewChange = useCallback((view: View) => {
    const mode = VIEW_MODES.find((v) => v.rbcView === view);
    if (mode) {
      setViewMode(mode.value);
    }
  }, []);

  // Format current date for display header
  const currentDateDisplay = useMemo(() => {
    const month = TURKISH_MONTHS[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    return `${month} ${year}`;
  }, [currentDate]);

  // Custom event component for react-big-calendar
  const EventComponent = useCallback(
    ({ event }: { event: { resource: CalendarEvent } }) => (
      <CalendarEventCard
        event={event.resource}
        compact
        onClick={() => handleEventClick(event)}
      />
    ),
    [handleEventClick]
  );

  // Custom messages for Turkish localization
  const messages = useMemo(
    () => ({
      today: t('calendar.navigation.today') || 'Bugun',
      previous: t('calendar.navigation.previous') || 'Onceki',
      next: t('calendar.navigation.next') || 'Sonraki',
      month: t('calendar.views.month') || 'Ay',
      week: t('calendar.views.week') || 'Hafta',
      day: t('calendar.views.day') || 'Gun',
      agenda: 'Gundem',
      date: 'Tarih',
      time: 'Saat',
      event: 'Is Emri',
      noEventsInRange: t('common.status.noData') || 'Is emri bulunamadi',
      showMore: (count: number) => `+${count} daha`,
    }),
    [t]
  );

  // Custom formats for Turkish locale
  const formats = useMemo(
    () => ({
      dateFormat: 'd',
      dayFormat: (date: Date) => TURKISH_DAYS_SHORT[date.getDay()],
      weekdayFormat: (date: Date) => TURKISH_DAYS_SHORT[date.getDay()],
      monthHeaderFormat: (date: Date) =>
        `${TURKISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      dayHeaderFormat: (date: Date) =>
        `${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${start.getDate()} - ${end.getDate()} ${TURKISH_MONTHS[end.getMonth()]} ${end.getFullYear()}`,
    }),
    []
  );

  return (
    <Layout>
      <div data-testid="calendar-page">
        <PageHeader
          title={t('calendar.title') || 'Takvim'}
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
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
            {/* Station Filter */}
            <div className="w-full sm:w-48">
              <Select value={stationFilter} onValueChange={handleStationChange}>
                <SelectTrigger aria-label={t('calendar.filters.station') || 'Istasyon'}>
                  <SelectValue
                    placeholder={t('calendar.filters.allStations') || 'Tum Istasyonlar'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('calendar.filters.allStations') || 'Tum Istasyonlar'}
                  </SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.code} value={station.code}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-40">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger aria-label={t('calendar.filters.status') || 'Durum'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1 ml-auto">
              {VIEW_MODES.map((mode) => (
                <Button
                  key={mode.value}
                  variant={viewMode === mode.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange(mode.value)}
                  data-active={viewMode === mode.value ? 'true' : 'false'}
                  data-testid={`calendar-view-${mode.value}`}
                  aria-pressed={viewMode === mode.value}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation and Date Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('TODAY')}
              aria-label={t('calendar.navigation.today') || 'Bugun'}
              data-testid="calendar-today-btn"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {t('calendar.navigation.today') || 'Bugun'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleNavigate('PREV')}
              aria-label={t('calendar.navigation.previous') || 'Onceki'}
              data-testid="calendar-prev-btn"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleNavigate('NEXT')}
              aria-label={t('calendar.navigation.next') || 'Sonraki'}
              data-testid="calendar-next-btn"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{currentDateDisplay}</h2>
        </div>

        {/* Loading State */}
        {isLoadingCalendar && (
          <div
            className="flex flex-col items-center justify-center py-12"
            data-testid="calendar-page-loading"
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
        {calendarError && !isLoadingCalendar && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{calendarError.message}</AlertDescription>
          </Alert>
        )}

        {/* Calendar View */}
        {!isLoadingCalendar && !calendarError && (
          <div
            data-testid="calendar-view"
            className="w-full bg-background rounded-lg border"
            style={{ height: 600 }}
            role="grid"
          >
            {calendarEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t('common.status.noData') || 'Is emri bulunamadi'}
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                date={currentDate}
                view={VIEW_MODES.find((v) => v.value === viewMode)?.rbcView || 'month'}
                onNavigate={handleRBCNavigate}
                onView={handleRBCViewChange}
                onSelectEvent={handleEventClick}
                components={{
                  event: EventComponent,
                  toolbar: () => null, // Hide default toolbar - we have custom navigation
                }}
                messages={messages}
                formats={formats}
                culture="tr-TR"
                style={{ height: '100%' }}
                popup
                views={['month', 'week', 'day']}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default CalendarPage;
