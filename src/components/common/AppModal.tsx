import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';

/**
 * Rich "app modal" (SMART master handoff Part 3 §5): tinted 48px icon tile,
 * 20/24px bold title, 16/24/32px padding, 90vh max height with internal
 * scroll, and the reference footer (outline Cancel + filled confirm with a
 * leading spinner/check icon; confirm stacks above Cancel on mobile).
 *
 * Confirmation modals are green (`--success`) — "yes" is always a positive
 * action; destructive modals stay red (`--danger`). Never a hardcoded hex.
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'sm:max-w-md!',
  md: 'sm:max-w-2xl!',
  lg: 'sm:max-w-2xl! md:max-w-3xl!',
  xl: 'sm:max-w-3xl! md:max-w-4xl! lg:max-w-5xl!',
};

interface AppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  size?: ModalSize;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  destructive?: boolean;
  loading?: boolean;
  hideFooter?: boolean;
  children?: React.ReactNode;
}

export const AppModal: React.FC<AppModalProps> = ({
  open,
  onOpenChange,
  icon,
  title,
  description,
  size = 'md',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmDisabled = false,
  destructive = false,
  loading = false,
  hideFooter = false,
  children,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      overlayClassName="bg-black/40"
      className={`${SIZE_CLASSES[size]} max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5 md:p-6 border-0 ring-0 shadow-2xl bg-card rounded-md sm:rounded-lg gap-0!`}
    >
      <div className="pb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="p-2.5 rounded-md shrink-0 flex items-center justify-center leading-none [&>svg]:w-5 [&>svg]:h-5"
              style={{
                backgroundColor: destructive ? 'var(--danger)' : 'var(--success)',
                color: '#ffffff',
              }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <DialogTitle
              className={`${size === 'sm' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} font-semibold! text-foreground leading-tight`}
            >
              {title}
            </DialogTitle>
          </div>
        </div>
        {description && (
          <DialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        )}
      </div>

      {children}

      {!hideFooter && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-3 border-t border-border">
          <Button
            variant="outline"
            className="rounded-md px-4 h-9"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button
              className="rounded-md px-4 h-9"
              style={
                destructive
                  ? { backgroundColor: 'var(--danger)', color: '#ffffff' }
                  : { backgroundColor: 'var(--success)', color: '#ffffff' }
              }
              disabled={loading || confirmDisabled}
              onClick={onConfirm}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {confirmLabel}
            </Button>
          )}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export {
  InfoCard,
  StatTile,
  AlertBanner,
  StepCards,
  ModalSection,
} from './AppModalBlocks';
export type { ModalTone, AlertVariant } from './AppModalBlocks';
