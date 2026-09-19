import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Lock, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { getLoginErrorMessage, ROLE_PORTAL_MESSAGE } from '../../utils/loginErrors';

interface LoginCardProps {
  onAuthenticated: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onAuthenticated }) => {
  const { login } = useMockData();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please fill in both fields to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await login(password, identifier);
      setLoading(false);
      if (result.ok) {
        if (result.user.role !== 'STUDENT' && result.user.role !== 'TEACHER') {
          setError(ROLE_PORTAL_MESSAGE);
        } else {
          onAuthenticated();
        }
      } else {
        setError(getLoginErrorMessage(result.code, result.message));
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
            <h2 className="text-base font-extrabold tracking-tight text-gray-900">SORT Login</h2>
            <p className="text-[11px] text-gray-400">Students use LRN · Staff use Employee ID</p>
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
              LRN / Employee ID
            </label>
            <input
              type="text"
              required
              placeholder="Enter your LRN or Employee ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-300 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
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
                Verifying…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        {/* Data privacy notice (RA 10173) */}
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#00271D]/10 bg-[#F9F3F0] px-3.5 py-3">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#00A77C]" strokeWidth={2} />
          <p className="text-[10px] leading-relaxed text-[#00271D]/70">
            Your credentials are verified by <span className="font-semibold">EnrollPro</span>. SORT never stores
            passwords. Learner and staff records are processed in line with RA 10173 (Data Privacy Act of 2012) and
            are visible only to authorised school personnel.
          </p>
        </div>
      </div>
    </div>
  );
};
