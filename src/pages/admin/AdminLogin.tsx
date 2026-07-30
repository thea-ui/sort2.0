import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { ShieldAlert, ArrowLeft, KeyRound, AlertOctagon, HelpCircle } from 'lucide-react';
import { SortLogo } from '../../components/common/SortLogo';

interface AdminLoginProps {
  onNavigate: (route: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => {
  const { login } = useMockData();

  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !employeeId) {
      setErrorMsg('Required parameters missing.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(employeeId, email);
      setLoading(false);
      if (success) {
        onNavigate('dashboard');
      } else {
        setErrorMsg('Security breach protection: Invalid admin credentials.');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Authentication failed. Please verify administrative credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: '#F9F3F0' }}>

      {/* Organic backdrop waves */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="15%" cy="20%" rx="38%" ry="30%" fill="#e0f2ec" opacity="0.55" />
        <ellipse cx="85%" cy="75%" rx="42%" ry="32%" fill="#d1f0e4" opacity="0.45" />
        <ellipse cx="55%" cy="50%" rx="25%" ry="18%" fill="#e0f2ec" opacity="0.3" />
      </svg>

      <div className="w-full max-w-sm z-10 space-y-4">

        {/* Back Button */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#00271D]/60 hover:text-[#00A77C] transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={13} />
          <span>Back to Landing</span>
        </button>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#00271D]/5">

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #C69B26, #e0b730)' }}>
              <ShieldAlert size={22} className="text-white" />
            </div>
            <SortLogo size={32} />
            <div>
              <h2 className="text-base font-black tracking-tight text-[#00271D] mt-1">Admin Gate</h2>
              <p className="text-[11px] text-[#00271D]/50 font-semibold">Protected Audit Console Access</p>
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
              <label className="font-bold text-[#00271D]/50 uppercase tracking-widest text-[9px]">Admin Email</label>
              <input
                type="email"
                required
                placeholder="root@sort.admin"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#00271D]/10 bg-[#F9F3F0]/60 text-xs text-[#00271D] outline-none focus:border-[#C69B26] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#00271D]/50 uppercase tracking-widest text-[9px]">Administrative ID</label>
              <input
                type="text"
                required
                placeholder="ADM-XXXX-XXX"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#00271D]/10 bg-[#F9F3F0]/60 text-xs text-[#00271D] outline-none focus:border-[#C69B26] focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#C69B26]/20"
              style={{ background: 'linear-gradient(135deg, #C69B26, #e0b730)' }}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Validating Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound size={12} />
                  <span>Verify Credentials</span>
                </>
              )}
            </button>
          </form>

          {/* Credentials helper */}
          <div className="mt-5 pt-3.5 border-t border-[#00271D]/8">
            <button
              type="button"
              onClick={() => setShowHelper(!showHelper)}
              className="w-full flex items-center justify-center gap-1.5 text-[9px] text-[#00271D]/40 hover:text-[#C69B26] transition-colors font-bold uppercase tracking-wider"
            >
              <HelpCircle size={10} />
              {showHelper ? 'Hide Key' : 'Reveal Security Credentials'}
            </button>

            {showHelper && (
              <div className="mt-3 bg-[#F9F3F0] border border-[#00271D]/10 rounded-xl p-3 text-[9px] text-[#00271D]/60 leading-normal space-y-1 text-center">
                <span className="font-bold text-[#C69B26] block uppercase">Root Provision Key</span>
                Email: <span className="text-[#00271D] select-all font-mono">admin@sort.edu</span><br />
                Password / ID: <span className="text-[#00271D] select-all font-mono">admin123</span> / <span className="text-[#00271D] select-all font-mono">ADM-2026-001</span>
              </div>
            )}
          </div>

        </div>

        <div className="text-center text-[9px] text-[#00271D]/30 font-semibold tracking-wider uppercase">
          S.O.R.T. Campus Gate v2.0 · Secure Protocol
        </div>

      </div>
    </div>
  );
};
