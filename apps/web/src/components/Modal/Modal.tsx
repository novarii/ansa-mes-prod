/**
 * Modal Component (Legacy)
 *
 * An overlay dialog component with close handling and backdrop support.
 * Renders via React Portal for proper z-index stacking.
 *
 * @deprecated Prefer using the shadcn Dialog from './ui/dialog' for new code.
 */

import React, { useEffect, useId, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModalSize = 'small' | 'medium' | 'large';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (optional) */
  title?: string;
  /** Modal size */
  size?: ModalSize;
  /** Modal content */
  children: ReactNode;
  /** Close when backdrop is clicked (default: true) */
  closeOnBackdropClick?: boolean;
  /** Close when Escape key is pressed (default: true) */
  closeOnEscape?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  small: 'max-w-sm modal__container--small',
  medium: 'max-w-lg modal__container--medium',
  large: 'max-w-2xl modal__container--large',
};

/**
 * Modal component for overlay dialogs.
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure?</p>
 *   <Button onClick={handleConfirm}>Confirm</Button>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'medium',
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: ModalProps): React.ReactElement | null {
  const titleId = useId();

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Add/remove event listeners and manage body scroll
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  // Create portal root if it doesn't exist
  let portalRoot = document.getElementById('modal-root');
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.id = 'modal-root';
    document.body.appendChild(portalRoot);
  }

  const modalContent = (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        data-testid="modal-backdrop"
        onClick={handleBackdropClick}
      >
        <div
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full rounded-lg border bg-background shadow-lg',
            sizeStyles[size]
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b p-4">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
            )}
            <button
              type="button"
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalRoot);
}
