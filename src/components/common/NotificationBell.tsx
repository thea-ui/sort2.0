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

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notifications
          </span>
          {count > 0 && (
            <button
              type="button"
              onClick={onDismissAll}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Dismiss all
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1">
          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">You&apos;re all caught up</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = SEVERITY_ICON[notification.severity];
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="items-start gap-2.5 px-3 py-2.5"
                  onClick={() => onSelect(notification.id)}
                >
                  <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', SEVERITY_COLOR[notification.severity])} />
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground leading-snug">
                      {notification.title}
                    </span>
                    {notification.description && (
                      <span className="text-xs text-muted-foreground leading-snug">
                        {notification.description}
                      </span>
                    )}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
