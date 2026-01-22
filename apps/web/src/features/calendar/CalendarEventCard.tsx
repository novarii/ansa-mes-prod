/**
 * CalendarEventCard Component
 *
 * Displays a work order event on the calendar view with color coding
 * based on status. Supports compact mode for calendar cells and
 * expanded mode for event details.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { useCallback, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CalendarEventColor } from '@org/shared-types';

/**
 * Color class mappings for event status
 */
const colorClasses: Record<CalendarEventColor, { bg: string; border: string; text: string }> = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-l-4 border-l-blue-500',
    text: 'text-blue-900 dark:text-blue-100',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-l-4 border-l-yellow-500',
    text: 'text-yellow-900 dark:text-yellow-100',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-l-4 border-l-green-500',
    text: 'text-green-900 dark:text-green-100',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-800/30',
    border: 'border-l-4 border-l-gray-400',
    text: 'text-gray-700 dark:text-gray-300',
  },
};

/**
 * CalendarEventCard Props
 */
export interface CalendarEventCardProps {
  /** The calendar event data */
  event: CalendarEvent;
  /** Whether to render in compact mode (default: true) */
  compact?: boolean;
  /** Click handler for event selection */
  onClick?: (docEntry: number) => void;
}

/**
 * CalendarEventCard Component
 *
 * Renders a work order event with status-based color coding.
 *
 * Display format:
 * - Line 1: WO-{DocNum}
 * - Line 2: ItemCode
 * - Line 3: CustomerName (truncated if long)
 */
export function CalendarEventCard({
  event,
  compact = true,
  onClick,
}: CalendarEventCardProps): JSX.Element {
  const { id, title, itemCode, itemName, customerName, color, machineName } = event;

  const colors = colorClasses[color] || colorClasses.gray;

  const handleClick = useCallback(() => {
    onClick?.(id);
  }, [onClick, id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(id);
      }
    },
    [onClick, id]
  );

  // Build tooltip content for full details
  const tooltipContent = [
    title,
    itemCode,
    itemName,
    customerName,
    machineName,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div
      data-testid={`calendar-event-${id}`}
      data-color={color}
      data-compact={compact ? 'true' : 'false'}
      className={cn(
        'rounded px-2 py-1 text-xs',
        colors.bg,
        colors.border,
        colors.text,
        onClick && 'cursor-pointer hover:opacity-80 hover:shadow-sm transition-all',
        compact ? 'min-h-[3rem]' : 'min-h-[5rem]'
      )}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Is Emri ${title}, ${itemCode}${customerName ? `, ${customerName}` : ''}`}
      title={tooltipContent}
    >
      {/* Work Order Title */}
      <div className="font-semibold truncate" data-field="title">
        {title}
      </div>

      {/* Item Code */}
      <div className="truncate text-[10px] opacity-80" data-field="itemCode">
        {itemCode}
      </div>

      {/* Customer Name (if available) */}
      {customerName && (
        <div className="truncate text-[10px] opacity-70" data-field="customer">
          {customerName}
        </div>
      )}

      {/* Extended info in non-compact mode */}
      {!compact && (
        <>
          {/* Item Name */}
          {itemName && (
            <div className="truncate text-[10px] opacity-70 mt-1" data-field="itemName">
              {itemName}
            </div>
          )}

          {/* Machine Name */}
          {machineName && (
            <div className="truncate text-[10px] opacity-60 mt-1" data-field="machine">
              {machineName}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CalendarEventCard;
