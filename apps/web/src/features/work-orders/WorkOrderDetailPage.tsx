/**
 * WorkOrderDetailPage Component
 *
 * Displays detailed information about a work order including:
 * - General tab: Work order details, quantities, dates
 * - Documents tab: PDF viewer for associated documents
 * - Pick List tab: BOM materials (read-only)
 *
 * @see specs/feature-production.md
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@org/shared-i18n';
import type {
  WorkOrderDetailResponse,
  PickListResponse,
} from '@org/shared-types';
import { useApiQuery } from '../../hooks/useApi';
import { Layout, PageHeader, Spinner } from '../../components';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { GeneralTab } from './GeneralTab';
import { DocumentsTab } from './DocumentsTab';
import { PickListTab } from './PickListTab';

/**
 * Work Order Detail Page
 *
 * Fetches and displays work order details with tabbed content.
 */
export function WorkOrderDetailPage(): React.ReactElement {
  const { docEntry } = useParams<{ docEntry: string }>();
  const { t } = useI18n();

  // Fetch work order detail
  const {
    data: workOrder,
    isLoading,
    error,
  } = useApiQuery<WorkOrderDetailResponse>(
    ['workOrder', docEntry],
    `/work-orders/${docEntry}`
  );

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div
          data-testid="work-order-detail-loading"
          aria-busy="true"
          className="flex min-h-[400px] items-center justify-center"
        >
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <PageHeader
          title={t('workOrders.title')}
          backTo="/"
          backLabel={t('common.actions.back') || 'Geri'}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{t('common.status.error')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t('errors.unknown')}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  // No data state (should not happen but TypeScript needs this)
  if (!workOrder) {
    return (
      <Layout>
        <PageHeader
          title={t('workOrders.title')}
          backTo="/"
          backLabel={t('common.actions.back') || 'Geri'}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{t('common.status.error')}</AlertTitle>
          <AlertDescription>{t('workOrders.noResults')}</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={workOrder.prodName}
        subtitle={`${workOrder.itemCode} - ${t('workOrders.columns.workOrderNo')}: ${workOrder.docNum}`}
        backTo="/"
        backLabel={t('common.actions.back') || 'Geri'}
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t('workOrders.tabs.general')}</TabsTrigger>
          <TabsTrigger value="documents">{t('workOrders.tabs.images')}</TabsTrigger>
          <TabsTrigger value="pickList">{t('workOrders.tabs.pickList')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab workOrder={workOrder} />
        </TabsContent>

        <TabsContent value="documents" data-testid="documents-tab-content">
          <DocumentsTab workOrder={workOrder} />
        </TabsContent>

        <TabsContent value="pickList">
          <PickListTabWrapper docEntry={workOrder.docEntry} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

/**
 * Wrapper component for PickListTab to handle data fetching
 */
function PickListTabWrapper({
  docEntry,
}: {
  docEntry: number;
}): React.ReactElement {
  const { data, isLoading, error } = useApiQuery<PickListResponse>(
    ['pickList', docEntry],
    `/work-orders/${docEntry}/pick-list`
  );

  return (
    <PickListTab
      items={data?.items ?? []}
      isLoading={isLoading}
      error={error}
    />
  );
}
