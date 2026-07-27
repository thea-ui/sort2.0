import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Truck, ArrowLeft, KeyRound, AlertCircle, HelpCircle } from 'lucide-react';

interface MRFLoginProps {
  onNavigate: (route: string) => void;
}

export const MRFLogin: React.FC<MRFLoginProps> = ({ onNavigate }) => {
  const { login } = useMockData();

  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  const handleMRFSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !employeeId) {
      setErrorMsg('All fields are required.');
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
        setErrorMsg('Authentication failed: Invalid logistics operator ID.');
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-4 relative overflow-hidden">
      
      {/* Decorative background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      {/* Background glow */}
      <div className="absolute h-96 w-96 bg-indigo-950/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-sm z-10 space-y-4">
        
        {/* Back Button */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={12} />
          <span>Back to Landing</span>
        </button>

        <div className="glass-panel border border-zinc-800 rounded-xl p-6 shadow-2xl relative">
          
          {/* Branded Icon Header */}
          <div className="text-center space-y-1.5 mb-6">
            <div className="h-10 w-10 bg-indigo-950/20 border border-indigo-900/35 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
              <Truck size={18} />
            </div>
            <h2 className="text-lg font-black tracking-tight text-zinc-200 uppercase">MRF Terminal</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Logistics & Dispatch Gate
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/30 border border-red-900/30 text-red-400 text-xs rounded-lg flex gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span className="font-semibold leading-normal">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleMRFSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Operator Email</label>
              <input
                type="email"
                required
                placeholder="mrf.staff@campus.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Logistics Badge ID</label>
              <input
                type="text"
                required
                placeholder="MRF-XXXX-XXX"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
                  <span>Syncing Operators...</span>
                </>
              ) : (
                <>
                  <KeyRound size={12} />
                  <span>Access Dispatch Terminal</span>
                </>
              )}
            </button>
          </form>

          {/* Helper tooltips for review */}
          <div className="mt-5 pt-3.5 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setShowHelper(!showHelper)}
              className="w-full flex items-center justify-center gap-1.5 text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors font-bold uppercase tracking-wider"
            >
              <HelpCircle size={10} />
              {showHelper ? 'Hide Key' : 'Reveal Staff Credentials'}
            </button>

            {showHelper && (
              <div className="mt-3 bg-zinc-905 border border-zinc-900 rounded-lg p-3 font-mono text-[9px] text-zinc-400 leading-normal space-y-1 text-center">
                <span className="font-bold text-indigo-400 block uppercase">Staff Key Access</span>
                Email: <span className="text-zinc-200 select-all">mrf.operations@campus.edu</span><br />
                ID: <span className="text-zinc-200 select-all">MRF-2026-001</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
