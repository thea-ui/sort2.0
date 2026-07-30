import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Lock, ArrowRight, AlertCircle, Eye, EyeOff, ChevronDown } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Student 1', color: 'text-sky-600',    email: 'student1@sort.edu',  id: 'student123' },
  { role: 'Student 2', color: 'text-sky-600',    email: 'student2@sort.edu',  id: 'student123' },
  { role: 'Teacher',   color: 'text-violet-600', email: 'teacher1@sort.edu',  id: 'teacher123' },
];

interface LoginCardProps {
  onAuthenticated: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onAuthenticated }) => {
  const { login } = useMockData();

  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [showId, setShowId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email);
    setEmployeeId(acc.id);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !employeeId.trim()) {
      setError('Please fill in both fields to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ok = await login(employeeId, email);
      setLoading(false);
      if (ok) {
        onAuthenticated();
      } else {
        setError('No account found in database. All credentials are pre-provisioned by the school administration.');
      }
    } catch {
      setLoading(false);
      setError('Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div id="login-card" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      {/* Top accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300" />

      <div className="p-7">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
            <Lock size={17} className="text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-gray-900">Staff & Student Access</h2>
            <p className="text-[11px] text-gray-400">Use your school-provisioned credentials</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" strokeWidth={2} />
            <p className="text-[11px] leading-relaxed text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Employee / Student ID
            </label>
            <div className="relative">
              <input
                type={showId ? 'text' : 'password'}
                required
                placeholder="STU-2026-000"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShowId(!showId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showId ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-emerald-100 transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Verifying credentials…
              </>
            ) : (
              <>
                Enter Control Console
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600"
          >
            <span>Reviewer Test Accounts</span>
            <ChevronDown size={13} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} />
          </button>

          {showDemo && (
            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="group flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className={`min-w-[52px] text-[9px] font-black uppercase tracking-wider ${acc.color}`}>
                    {acc.role}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] text-gray-600">{acc.email}</p>
                    <p className="font-mono text-[10px] text-gray-400">{acc.id}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-[9px] font-semibold text-gray-400 group-hover:text-emerald-600">
                    Fill →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
