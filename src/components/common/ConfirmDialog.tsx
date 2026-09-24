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
  children?: React.ReactNode;
}

/** Confirmation wrapper over AppModal — replaces `window.confirm` (SMART parity). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  destructive = false,
  confirmLabel = 'Confirm',
  ...rest
}) => (
  <AppModal
    {...rest}
    size="sm"
    icon={destructive ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
    confirmLabel={confirmLabel}
    destructive={destructive}
  />
);
