import React from 'react';
import { WifiOff } from 'lucide-react';
import { useProviderStatus } from '../../hooks/useProviderStatus';

/**
 * EnrollPro outage notices.
 *
 * SORT delegates credential checks to EnrollPro, so a provider outage is not a
 * SORT failure — but it does block fresh sign-ins. These surfaces say so
 * plainly and point at the break-glass offline PIN instead of leaving users to
 * guess why "Sign In" suddenly fails. Existing sessions are unaffected and the
 * copy reflects that.
 */

/** Pre-login notice, shown above the login form while the provider is down. */
export const OfflineLoginNotice: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { status } = useProviderStatus();
  if (!status || status.online) return null;

  return (
    <div
      role="status"
      className={`mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 ${className}`}
    >
      <WifiOff size={15} className="mt-0.5 shrink-0 text-amber-600" strokeWidth={2.2} />
      <div className="min-w-0">
        <p className="text-[12px] font-bold leading-tight text-amber-900">EnrollPro is offline</p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
          EnrollPro sign-in is temporarily unavailable, so passwords cannot be verified right now. If you
          have set an <span className="font-semibold">offline PIN</span>, enter it in the password field to
          sign in. Anyone already signed in can keep working.
        </p>
      </div>
    </div>
  );
};

/**
 * In-app indicator for a session that was verified with an offline PIN rather
 * than by EnrollPro.
 */
export const OfflineSessionBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    role="status"
    title="This session was verified with your offline PIN because EnrollPro was unreachable. Sign in again normally once EnrollPro is back."
    className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 ${className}`}
  >
    <WifiOff size={11} strokeWidth={2.5} />
    Offline mode
  </span>
);
