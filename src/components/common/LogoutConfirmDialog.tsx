import React from 'react';
import { LogOut } from 'lucide-react';
import { AppModal } from './AppModal';

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => (
  <AppModal
    open={open}
    onOpenChange={onOpenChange}
    icon={<LogOut />}
    title="Sign out of SORT?"
    description="You will be returned to the sign-in screen and will need your credentials to access your account again. Make sure your work is saved before continuing."
    confirmLabel="Sign Out"
    cancelLabel="Stay Signed In"
    onConfirm={onConfirm}
    destructive
  />
);
