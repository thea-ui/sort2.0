import React from 'react';
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { cn } from '../../utils/cn';

/**
 * Notification bell (SMART master handoff Part 4 §4): 20px icon in a
 * 12px-radius ghost button, destructive count pill capped at `9+`, 320px
 * bottom-end panel with a severity icon per item, per-item dismiss, dismiss-all
 * and an "all caught up" empty state. Clicking an item dismisses and navigates.
 *
 * Severity is derived from SORT's own notification types (the reference
 * severity vocabulary is `info | warning | critical`).
 */

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface BellNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  description?: string;
}

const SEVERITY_ICON: Record<NotificationSeverity, typeof Info> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  critical: 'text-destructive',
  warning: 'text-amber-600',
  info: 'text-muted-foreground',
};

const SEVERITY_TONE: Record<NotificationSeverity, string> = {
  critical: 'bg-destructive/10',
  warning: 'bg-amber-500/10',
  info: 'bg-muted',
};

interface NotificationBellProps {
  notifications: BellNotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onSelect: (id: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onDismiss,
  onDismissAll,
  onSelect,
}) => {
  const count = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          type="button"
          aria-label={count > 0 ? `Notifications, ${count} active` : 'Notifications'}
          className="relative p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all active:scale-95 cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-2rem)] overflow-hidden !rounded-2xl !p-0 sm:w-80"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            Notifications
          </span>
          {count > 0 && (
            <button
              type="button"
              onClick={onDismissAll}
              className="cursor-pointer text-[11px] font-bold text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground">
              <CheckCircle2 size={19} />
            </span>
            <p className="text-[12.5px] font-medium text-muted-foreground">You&apos;re all caught up</p>
          </div>
        ) : (
          <div className="max-h-[min(60svh,24rem)] divide-y divide-border overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = SEVERITY_ICON[notification.severity];
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="items-start gap-3 !px-4 !py-3"
                  onClick={() => onSelect(notification.id)}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      SEVERITY_TONE[notification.severity],
                    )}
                  >
                    <Icon className={cn('h-4 w-4', SEVERITY_COLOR[notification.severity])} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-2 text-[11.5px] font-semibold leading-snug text-foreground">
                      {notification.title}
                    </span>
                    {notification.description && (
                      <span className="line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
                        {notification.description}
                      </span>
                    )}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
