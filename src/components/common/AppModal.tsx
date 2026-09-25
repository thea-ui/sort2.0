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
 * Confirm/tile colors come from `--theme-primary` (never a hardcoded brand
 * hex) with `--theme-primary-text` for contrast; destructive uses `#dc2626`
 * exactly as specified.
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
      className={`${SIZE_CLASSES[size]} max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 border-0 ring-0 shadow-2xl bg-card rounded-xl sm:rounded-2xl gap-0!`}
    >
      <div className="pb-4 sm:pb-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {icon && (
            <div
              className="p-3 rounded-xl shadow-lg shrink-0 flex items-center justify-center leading-none [&>svg]:w-6 [&>svg]:h-6"
              style={{
                backgroundColor: destructive ? '#dc2626' : 'var(--theme-primary)',
                color: destructive ? '#ffffff' : 'var(--theme-primary-text, #ffffff)',
              }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-xl sm:text-2xl font-bold! text-foreground leading-tight">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>
      </div>

      {children}

      {!hideFooter && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-4 border-t border-border">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button
              className="rounded-xl"
              style={
                destructive
                  ? { backgroundColor: '#dc2626', color: '#ffffff' }
                  : { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-text, #ffffff)' }
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
