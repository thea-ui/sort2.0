import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, LogOut, X } from 'lucide-react';
import { User } from '../../types';

interface ProfileMenuProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
}

const ROLE_LABELS: Record<User['role'], string> = {
  STUDENT: 'Student',
  TEACHER: 'Faculty',
  MRF: 'MRF Staff',
  ADMIN: 'System Administrator',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ user, onClose, onLogout }) => {
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const closePasswordInfo = () => {
    setShowPasswordInfo(false);
    onClose();
  };

  useEffect(() => {
    if (!showPasswordInfo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPasswordInfo(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPasswordInfo, onClose]);

  return (
    <>
      <div className="w-64 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Account Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#00A77C] text-white font-black flex items-center justify-center text-xs">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase leading-tight text-[#00271D] truncate">{user.name}</p>
            <p className="text-[11px] font-bold leading-tight text-[#00A77C]">{ROLE_LABELS[user.role]}</p>
            <p className="mt-0.5 text-[10px] font-mono text-gray-400 truncate">Employee ID: {user.employeeId}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => setShowPasswordInfo(true)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-[#00271D] transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <KeyRound size={15} className="text-[#00271D]/50" />
            Change Password
          </button>
        </div>

        <div className="border-t border-gray-100 p-1.5">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      {showPasswordInfo && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Change password information"
          onClick={closePasswordInfo}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00A77C]/15 text-[#00A77C]">
                <KeyRound size={19} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-sm font-heading font-black text-[#00271D]">Change Password</h3>
                <p className="text-xs font-medium leading-relaxed text-[#00271D]/70">
                  Your S.O.R.T. password is managed by the EnrollPro portal. Please update it there, then sign in
                  again with your new credentials.
                </p>
                <p className="pt-0.5 text-[10px] font-mono text-gray-400 truncate">Account ID: {user.employeeId}</p>
              </div>
              <button
                type="button"
                onClick={closePasswordInfo}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={closePasswordInfo}
                className="rounded-xl bg-[#00A77C] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#00A77C]/20 transition-all hover:bg-[#008f6a] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
