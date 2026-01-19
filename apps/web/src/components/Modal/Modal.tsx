/**
 * Modal Component
 *
 * An overlay dialog component with close handling and backdrop support.
 * Renders via React Portal for proper z-index stacking.
 */

import React, { useEffect, useId, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.scss';

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
    <div className="modal">
      <div
        className="modal__backdrop"
        data-testid="modal-backdrop"
        onClick={handleBackdropClick}
      >
        <div
          className={`modal__container modal__container--${size}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal__header">
            {title && (
              <h2 id={titleId} className="modal__title">
                {title}
              </h2>
            )}
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg
                className="modal__close-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="modal__body">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalRoot);
}
