/**
 * WorkOrderDetailPage Component
 *
 * Displays detailed information about a work order including:
 * - General tab: Work order details, quantities, dates
 * - Documents tab: PDF viewer for associated documents
 * - Pick List tab: BOM materials (read-only)
 * - Production controls: Activity buttons, production entry
 *
 * @see specs/feature-production.md
 */

import React, { useState, useCallback } from 'react';
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
import { Button } from '../../components/ui/button';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { GeneralTab } from './GeneralTab';
import { DocumentsTab } from './DocumentsTab';
import { PickListTab } from './PickListTab';
import {
  ActivityButtons,
  StartActivityModal,
  StopActivityMultiModal,
  ProductionEntryModal,
} from '../production';

/**
 * Work Order Detail Page
 *
 * Fetches and displays work order details with tabbed content.
 */
export function WorkOrderDetailPage(): React.ReactElement {
  const { docEntry } = useParams<{ docEntry: string }>();
  const { t } = useI18n();

  // Modal state
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isProductionEntryModalOpen, setIsProductionEntryModalOpen] = useState(false);

  // Fetch work order detail
  const {
    data: workOrder,
    isLoading,
    error,
    refetch,
  } = useApiQuery<WorkOrderDetailResponse>(
    ['workOrder', docEntry],
    `/work-orders/${docEntry}`
  );

  // Handlers for modals
  const handleStartEmployeesRequired = useCallback(() => {
    setIsStartModalOpen(true);
  }, []);

  const handleStartModalClose = useCallback(() => {
    setIsStartModalOpen(false);
  }, []);

  const handleStartModalSuccess = useCallback(() => {
    setIsStartModalOpen(false);
    // Refresh activity state (handled by modal invalidation)
  }, []);

  const handleStopEmployeesRequired = useCallback(() => {
    setIsStopModalOpen(true);
  }, []);

  const handleStopModalClose = useCallback(() => {
    setIsStopModalOpen(false);
  }, []);

  const handleStopModalSuccess = useCallback(() => {
    setIsStopModalOpen(false);
    // Refresh activity state (handled by modal invalidation)
  }, []);

  const handleProductionEntryClick = useCallback(() => {
    setIsProductionEntryModalOpen(true);
  }, []);

  const handleProductionEntryClose = useCallback(() => {
    setIsProductionEntryModalOpen(false);
  }, []);

  const handleProductionEntrySuccess = useCallback(() => {
    setIsProductionEntryModalOpen(false);
    // Refresh work order data
    refetch();
  }, [refetch]);

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

      {/* Production Controls Section */}
      <div className="mb-6 space-y-4" data-testid="production-controls">
        {/* Activity Buttons */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('production.activity.currentState')}
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <ActivityButtons
              docEntry={workOrder.docEntry}
              onStartEmployeesRequired={handleStartEmployeesRequired}
              onStopEmployeesRequired={handleStopEmployeesRequired}
            />
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={handleProductionEntryClick}
              data-testid="production-entry-button"
            >
              <ClipboardList className="mr-2 size-4" />
              {t('workOrders.actions.productionEntry')}
            </Button>
          </div>
        </div>
      </div>

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

      {/* Start Activity Modal (Employee Selection) */}
      <StartActivityModal
        isOpen={isStartModalOpen}
        docEntry={workOrder.docEntry}
        onClose={handleStartModalClose}
        onSuccess={handleStartModalSuccess}
      />

      {/* Stop Activity Modal (Employee + Break Reason Selection) */}
      <StopActivityMultiModal
        isOpen={isStopModalOpen}
        docEntry={workOrder.docEntry}
        onClose={handleStopModalClose}
        onSuccess={handleStopModalSuccess}
      />

      {/* Production Entry Modal */}
      <ProductionEntryModal
        isOpen={isProductionEntryModalOpen}
        workOrder={workOrder}
        onClose={handleProductionEntryClose}
        onSuccess={handleProductionEntrySuccess}
      />
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
      hasStockWarning={data?.hasStockWarning}
    />
  );
}
