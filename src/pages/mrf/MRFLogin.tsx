import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Truck, ArrowLeft, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { SortLogo } from '../../components/common/SortLogo';

interface MRFLoginProps {
  onNavigate: (route: string) => void;
}

export const MRFLogin: React.FC<MRFLoginProps> = ({ onNavigate }) => {
  const { login } = useMockData();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMRFSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Employee ID and password are required.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(password, identifier);
      setLoading(false);
      if (success) {
        onNavigate('dashboard');
      } else {
        setErrorMsg('Invalid Employee ID or password.');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#F9F3F0' }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="15%" cy="20%" rx="38%" ry="30%" fill="#e0f2ec" opacity="0.55" />
        <ellipse cx="85%" cy="75%" rx="42%" ry="32%" fill="#d1f0e4" opacity="0.45" />
        <ellipse cx="55%" cy="50%" rx="25%" ry="18%" fill="#e0f2ec" opacity="0.3" />
      </svg>

      <div className="w-full max-w-sm z-10 space-y-4">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#00271D]/60 hover:text-[#00A77C] transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={13} />
          <span>Back to Landing</span>
        </button>

        <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xl shadow-[#00271D]/5">
          <div className="text-center space-y-2 mb-6">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #00A77C, #00c491)' }}>
              <Truck size={22} className="text-white" />
            </div>
            <SortLogo size={32} />
            <div>
              <h2 className="text-base font-black tracking-tight text-[#00271D] mt-1">MRF Terminal</h2>
              <p className="text-[11px] text-[#00271D]/50 font-semibold">Use your Employee ID from EnrollPro</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span className="font-semibold leading-normal">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleMRFSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#00271D]/50 uppercase tracking-widest text-[9px]">Employee ID</label>
              <input
                type="text"
                required
                placeholder="e.g. 1234503"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#00271D]/10 bg-[#F9F3F0]/60 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#00271D]/50 uppercase tracking-widest text-[9px]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#00271D]/10 bg-[#F9F3F0]/60 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-all"
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
              className="w-full mt-2 py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#00A77C]/20"
              style={{ background: 'linear-gradient(135deg, #00A77C, #00c491)' }}
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

        <div className="text-center text-[9px] text-[#00271D]/30 font-semibold tracking-wider uppercase">
          S.O.R.T. MRF Portal
        </div>
      </div>
    </div>
  );
};
