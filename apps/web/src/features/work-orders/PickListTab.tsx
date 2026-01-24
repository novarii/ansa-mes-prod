/**
 * PickListTab Component
 *
 * Displays BOM materials (pick list) for a work order.
 * This is READ-ONLY - material issues are performed in SAP B1.
 *
 * @see specs/feature-production.md - Section 4: Pick List
 */

import React from 'react';
import { useI18n } from '@org/shared-i18n';
import type { PickListItem } from '@org/shared-types';
import { Card, CardContent } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { Info, Package, CheckCircle, AlertTriangle } from 'lucide-react';

export interface PickListTabProps {
  /** Pick list items */
  items: PickListItem[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether any material has stock warning */
  hasStockWarning?: boolean;
}

/**
 * Pick List Tab content for Work Order Detail
 *
 * Displays materials required for the work order with quantities.
 * Rows with remaining quantity are highlighted.
 */
export function PickListTab({
  items,
  isLoading,
  error,
  hasStockWarning,
}: PickListTabProps): React.ReactElement {
  const { t, formatNumber } = useI18n();

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="pick-list-loading"
        aria-busy="true"
        className="flex min-h-[200px] items-center justify-center"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>
          {error.message || t('errors.unknown')}
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package
            className="size-12 text-muted-foreground/50"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-medium text-muted-foreground">
            {t('common.noMaterials') || 'Malzeme bulunamadi'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground/70">
            {t('common.noMaterialsDescription') ||
              'Bu is emri icin tanimli malzeme bulunmamaktadir.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Stock Warning Alert */}
      {hasStockWarning && (
        <Alert variant="destructive" data-testid="stock-warning-alert">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Yetersiz hammadde stogu. Bazi malzemelerin stogu eksik.
          </AlertDescription>
        </Alert>
      )}

      {/* SAP Notice */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          {t('production.pickList.sapNote')}
        </AlertDescription>
      </Alert>

      {/* Pick List Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('production.pickList.stockCode')}</TableHead>
                <TableHead>{t('production.pickList.stockName')}</TableHead>
                <TableHead className="text-right">
                  {t('production.pickList.plannedQty')}
                </TableHead>
                <TableHead className="text-right">
                  {t('production.pickList.pickedQty')}
                </TableHead>
                <TableHead className="text-right">
                  {t('workOrders.columns.remainingQty')}
                </TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>{t('production.pickList.warehouse')}</TableHead>
                <TableHead>{t('production.movements.unit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.itemCode}
                  data-testid={`pick-list-row-${item.itemCode}`}
                  className={
                    item.stockStatus === 'INSUFFICIENT'
                      ? 'bg-destructive/10'
                      : item.remainingQty > 0
                        ? 'bg-warning/10'
                        : ''
                  }
                >
                  <TableCell className="font-medium">{item.itemCode}</TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.plannedQty, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.issuedQty, 0)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      item.remainingQty > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {formatNumber(item.remainingQty, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.availableQty !== undefined
                      ? formatNumber(item.availableQty, 0)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.stockStatus === 'INSUFFICIENT' ? (
                      <span
                        className="inline-flex items-center gap-1 text-destructive"
                        data-testid={`stock-status-${item.itemCode}`}
                      >
                        <AlertTriangle className="size-4" />
                        Eksik
                      </span>
                    ) : item.stockStatus === 'OK' ? (
                      <span
                        className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"
                        data-testid={`stock-status-${item.itemCode}`}
                      >
                        <CheckCircle className="size-4" />
                        Yeterli
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{item.warehouse}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
