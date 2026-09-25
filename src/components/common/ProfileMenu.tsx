import React, { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { User } from '../../types';
import { ROLE_LABELS, getInitials } from '../../utils/userDisplay';
import { OfflinePinModal } from '../auth/OfflinePinModal';

interface ProfileMenuProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ user, onClose, onLogout }) => {
  const [showPinModal, setShowPinModal] = useState(false);

  return (
    <>
      <div className="w-64 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Account Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--accent)] text-white font-black flex items-center justify-center text-xs">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase leading-tight text-[var(--text-strong)] truncate">{user.name}</p>
            <p className="text-[11px] font-bold leading-tight text-[var(--accent)]">{ROLE_LABELS[user.role]}</p>
            <p className="mt-0.5 text-[10px] font-mono text-gray-400 truncate">Employee ID: {user.employeeId}</p>
          </div>
        </div>

        {/* Passwords are managed by EnrollPro. The only local credential is the
            optional break-glass offline PIN used during an EnrollPro outage. */}
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              setShowPinModal(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-[var(--text-strong)] transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <KeyRound size={15} />
            Offline PIN
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      <OfflinePinModal open={showPinModal} onOpenChange={setShowPinModal} />
    </>
  );
};
