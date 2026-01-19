/**
 * DocumentsTab Component
 *
 * Displays PDF documents associated with a work order.
 * Uses browser's native PDF rendering capability via iframe or object tag.
 *
 * @see specs/feature-production.md - Section 5: Recipe/PDF Viewer
 */

import React from 'react';
import { useI18n } from '@org/shared-i18n';
import type { WorkOrderDetailResponse } from '@org/shared-types';
import { Card, CardContent } from '../../components/ui/card';
import { FileText } from 'lucide-react';

export interface DocumentsTabProps {
  /** Work order data */
  workOrder: WorkOrderDetailResponse;
}

/**
 * Documents Tab content for Work Order Detail
 *
 * Displays PDF viewer for work order documents (recipes, drawings, work instructions).
 * Falls back to download link for unsupported browsers.
 */
export function DocumentsTab({ workOrder }: DocumentsTabProps): React.ReactElement {
  const { t } = useI18n();

  // TODO: In a real implementation, the work order would have a document URL field
  // For now, we show a placeholder since the DTO doesn't include document URL yet
  const documentUrl: string | null = null;

  if (!documentUrl) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText
            className="size-12 text-muted-foreground/50"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-medium text-muted-foreground">
            {t('common.noDocuments') || 'Dokuman bulunamadi'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground/70">
            {t('common.noDocumentsDescription') ||
              'Bu is emri icin yuklu dokuman bulunmamaktadir.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="p-0">
        <div className="recipe-viewer">
          <object
            data={documentUrl}
            type="application/pdf"
            width="100%"
            height="600"
            className="min-h-[600px] w-full rounded-lg"
            aria-label={`${t('workOrders.tabs.images')} - ${workOrder.prodName}`}
          >
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText
                className="size-12 text-muted-foreground/50"
                aria-hidden="true"
              />
              <p className="mt-4 text-sm text-muted-foreground">
                {t('common.pdfNotSupported') ||
                  'PDF goruntulenemedi. Asagidaki baglantidan indirebilirsiniz.'}
              </p>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
              >
                {t('common.downloadPdf') || "PDF'i indir"}
              </a>
            </div>
          </object>
        </div>
      </CardContent>
    </Card>
  );
}
