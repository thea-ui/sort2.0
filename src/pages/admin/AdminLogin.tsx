import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { ShieldAlert, ArrowLeft, KeyRound, AlertOctagon, Eye, EyeOff } from 'lucide-react';
import { SortLogo } from '../../components/common/SortLogo';
import { getLoginErrorMessage, ROLE_PORTAL_MESSAGE } from '../../utils/loginErrors';

interface AdminLoginProps {
  onNavigate: (route: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => {
  const { login } = useMockData();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Employee ID and password are required.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await login(password, identifier);
      setLoading(false);
      if (result.ok) {
        if (result.user.role !== 'ADMIN') {
          setErrorMsg(ROLE_PORTAL_MESSAGE);
        } else {
          onNavigate('dashboard');
        }
      } else {
        setErrorMsg(getLoginErrorMessage(result.code, result.message));
      }
    } catch {
      setLoading(false);
      setErrorMsg('Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--background)' }}>

      <div className="w-full max-w-sm z-10 space-y-4">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-strong)]/60 hover:text-[var(--accent)] transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={13} />
          <span>Back to Landing</span>
        </button>

        <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-[var(--primary)]/5">
          <div className="text-center space-y-2 mb-6">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--gold), #e0b730)' }}>
              <ShieldAlert size={22} className="text-white" />
            </div>
            <SortLogo size={32} />
            <div>
              <h2 className="text-base font-black tracking-tight text-[var(--text-strong)] mt-1">Admin Gate</h2>
              <p className="text-[11px] text-[var(--text-strong)]/50 font-semibold">Use your Employee ID from EnrollPro</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex gap-2">
              <AlertOctagon size={14} className="shrink-0 mt-0.5" />
              <span className="font-semibold leading-normal">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--text-strong)]/50 uppercase tracking-widest text-[9px]">Employee ID</label>
              <input
                type="text"
                required
                placeholder="Enter Employee ID"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 text-xs text-[var(--text-strong)] outline-none focus:border-[var(--gold)] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--text-strong)]/50 uppercase tracking-widest text-[9px]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 text-xs text-[var(--text-strong)] outline-none focus:border-[var(--gold)] focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[var(--gold)]/20"
              style={{ background: 'linear-gradient(135deg, var(--gold), #e0b730)' }}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <KeyRound size={12} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-[9px] text-[var(--text-strong)]/30 font-semibold tracking-wider uppercase">
          S.O.R.T. Admin Portal
        </div>
      </div>
    </div>
  );
};
