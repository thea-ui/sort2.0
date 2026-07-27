import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { ShieldAlert, ArrowLeft, KeyRound, AlertOctagon, HelpCircle } from 'lucide-react';

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

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !employeeId) {
      setErrorMsg('Required parameters missing.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const success = login(employeeId, email);
      setLoading(false);

      if (success) {
        onNavigate('dashboard');
      } else {
        setErrorMsg('Security breach protection: Invalid admin credentials.');
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-6 relative overflow-hidden">
      
      {/* Structural security guidelines grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(244,63,94,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,63,94,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Background glow */}
      <div className="absolute h-96 w-96 bg-red-950/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-sm z-10 space-y-6">
        
        {/* Back Button */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={12} />
          <span>Exit Security Gate</span>
        </button>

        <div className="glass-panel border border-zinc-800 rounded-xl p-6 md:p-8 shadow-2xl relative">
          
          {/* Industrial Heading */}
          <div className="text-center space-y-2 mb-6">
            <div className="h-10 w-10 bg-red-950/20 border border-red-900/30 text-red-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <ShieldAlert size={20} />
            </div>
            <h2 className="text-lg font-black tracking-widest text-zinc-200 uppercase">Admin Gate</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Protected Audit Console Access
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/30 border border-red-900/30 text-red-400 text-xs rounded-lg flex gap-2">
              <AlertOctagon size={14} className="shrink-0 mt-0.5" />
              <span className="font-mono text-[10px] leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Admin Email</label>
              <input
                type="email"
                required
                placeholder="root@sort.admin"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-lg text-xs font-mono text-red-400 border-zinc-800/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Administrative ID</label>
              <input
                type="text"
                required
                placeholder="ADM-XXXX-XXX"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-lg text-xs font-mono text-red-400 border-zinc-800/80"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-red-950 hover:text-red-400 text-zinc-300 font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
                  <span className="font-mono text-[10px]">Validating Cryptography...</span>
                </>
              ) : (
                <>
                  <KeyRound size={12} />
                  <span>Verify Credentials</span>
                </>
              )}
            </button>
          </form>

          {/* Helper details */}
          <div className="mt-5 pt-3.5 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setShowHelper(!showHelper)}
              className="w-full flex items-center justify-center gap-1.5 text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors font-bold uppercase tracking-wider"
            >
              <HelpCircle size={10} />
              {showHelper ? 'Hide Key' : 'Reveal Security Credentials'}
            </button>

            {showHelper && (
              <div className="mt-3 bg-zinc-950/80 border border-zinc-900 rounded-lg p-3 font-mono text-[9px] text-red-450/80 leading-normal space-y-1 text-center">
                <span className="font-black text-red-500 block uppercase">Root Provision Key</span>
                Email: <span className="text-zinc-300 select-all">admin.sort@campus.edu</span><br />
                ID: <span className="text-zinc-300 select-all">ADM-2026-007</span>
              </div>
            )}
          </div>

        </div>

        <div className="text-center font-mono text-[9px] text-zinc-600">
          SECURE CONNECTION PROTOCOL V2 // SORT-ROOT-GATEWAY
        </div>

      </div>

    </div>
  );
};
