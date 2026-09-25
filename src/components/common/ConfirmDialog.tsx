import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AppModal } from './AppModal';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Confirmation wrapper over AppModal (SMART master handoff Part 3 §8):
 * `AlertTriangle` + red confirm for destructive, `CheckCircle2` + primary for
 * normal, always size `sm`.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  destructive = false,
  confirmLabel = 'Confirm',
  icon,
  ...rest
}) => (
  <AppModal
    {...rest}
    size="sm"
    icon={icon ?? (destructive ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />)}
    confirmLabel={confirmLabel}
    destructive={destructive}
  />
);
