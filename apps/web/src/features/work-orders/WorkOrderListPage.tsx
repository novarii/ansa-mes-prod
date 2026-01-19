/**
 * Work Order List Page
 *
 * Displays a filterable list of work orders for the current station.
 * Supports search, customer filtering, and pagination.
 *
 * @see specs/feature-production.md
 * @see specs/i18n-turkish-locale.md
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@org/shared-i18n';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApi';
import type { WorkOrderListResponse, CustomerFilterOption } from '@org/shared-types';
import {
  Layout,
  PageHeader,
  SearchInput,
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
import { WorkOrderCard } from './WorkOrderCard';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

/**
 * Filter state
 */
interface FilterState {
  search: string;
  customerCode: string | null;
}

/**
 * Work Order List Page Component
 */
export function WorkOrderListPage(): JSX.Element {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { stationName } = useAuth();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    customerCode: null,
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      limit,
    };
    if (filters.search) {
      params.search = filters.search;
    }
    if (filters.customerCode) {
      params.customerCode = filters.customerCode;
    }
    return params;
  }, [filters.search, filters.customerCode, page, limit]);

  // Fetch work orders
  const {
    data: workOrdersResponse,
    isLoading: isLoadingWorkOrders,
    error: workOrdersError,
    refetch: refetchWorkOrders,
    isFetching,
  } = useApiQuery<WorkOrderListResponse>(
    ['workOrders', queryParams],
    '/work-orders',
    queryParams
  );

  // Fetch customer filter options
  const { data: customerOptions = [] } = useApiQuery<CustomerFilterOption[]>(
    ['customerFilterOptions'],
    '/work-orders/filters/customers'
  );

  // Check if any filters are active
  const hasActiveFilters = filters.search !== '' || filters.customerCode !== null;

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1); // Reset to first page on search
  }, []);

  // Handle customer filter change
  const handleCustomerChange = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      customerCode: value === 'all' ? null : value,
    }));
    setPage(1); // Reset to first page on filter change
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({ search: '', customerCode: null });
    setPage(1);
  }, []);

  // Handle card click - navigate to detail page
  const handleCardClick = useCallback(
    (docEntry: number) => {
      navigate(`/work-orders/${docEntry}`);
    },
    [navigate]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchWorkOrders();
  }, [refetchWorkOrders]);

  const workOrders = workOrdersResponse?.items ?? [];
  const totalItems = workOrdersResponse?.total ?? 0;
  const totalPages = workOrdersResponse?.totalPages ?? 1;
  const hasMorePages = page < totalPages;

  return (
    <Layout>
      <div data-testid="work-order-list-page">
      <PageHeader
        title={t('workOrders.title') || 'Is Emirleri'}
        subtitle={stationName ?? undefined}
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
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <SearchInput
              onSearch={handleSearch}
              placeholder={t('common.actions.search') || 'Ara...'}
              aria-label={t('common.actions.search') || 'Ara'}
              debounceMs={300}
            />
          </div>

          {/* Customer Filter */}
          <div className="w-full sm:w-64">
            <Select
              value={filters.customerCode ?? 'all'}
              onValueChange={handleCustomerChange}
            >
              <SelectTrigger aria-label={t('workOrders.columns.customer') || 'Musteri'}>
                <SelectValue
                  placeholder={t('workOrders.columns.customer') || 'Musteri Sec'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('common.all') || 'Tumu'}
                </SelectItem>
                {customerOptions.map((customer) => (
                  <SelectItem key={customer.code} value={customer.code}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters & Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('common.activeFilters') || 'Aktif filtreler:'}
            </span>
            {filters.search && (
              <Badge variant="secondary">
                Arama: {filters.search}
              </Badge>
            )}
            {filters.customerCode && (
              <Badge variant="secondary">
                Musteri:{' '}
                {customerOptions.find((c) => c.code === filters.customerCode)
                  ?.name ?? filters.customerCode}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 px-2"
              aria-label={t('common.actions.clearFilters') || 'Filtreleri Temizle'}
            >
              <X className="h-4 w-4 mr-1" />
              {t('common.actions.clearFilters') || 'Filtreleri Temizle'}
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoadingWorkOrders && (
        <div
          className="flex flex-col items-center justify-center py-12"
          data-testid="work-order-list-loading"
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
      {workOrdersError && !isLoadingWorkOrders && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {workOrdersError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Work Order List */}
      {!isLoadingWorkOrders && !workOrdersError && (
        <>
          {/* Results count */}
          <div className="mb-4 text-sm text-muted-foreground">
            {totalItems > 0 ? (
              <span>
                {totalItems} {t('workOrders.count') || 'is emri'}{' '}
                {hasActiveFilters && (t('common.filtered') || '(filtrelenmis)')}
              </span>
            ) : null}
          </div>

          {/* Empty State */}
          {workOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {t('workOrders.noResults') || 'Is emri bulunamadi'}
              </p>
              {hasActiveFilters && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('workOrders.tryDifferentFilters') ||
                    'Farkli filtreler deneyebilirsiniz'}
                </p>
              )}
            </div>
          )}

          {/* Work Order Cards Grid */}
          {workOrders.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workOrders.map((workOrder) => (
                <WorkOrderCard
                  key={workOrder.docEntry}
                  workOrder={workOrder}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMorePages && workOrders.length > 0 && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {t('common.status.loading') || 'Yukleniyor...'}
                  </>
                ) : (
                  t('common.actions.loadMore') || 'Daha Fazla Yukle'
                )}
              </Button>
            </div>
          )}
        </>
      )}
      </div>
    </Layout>
  );
}

export default WorkOrderListPage;
