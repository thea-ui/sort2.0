import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { FormBanner } from '../../../../components/common/InlineBanner';
import { apiService } from '../../../../services/api';

interface StatusShape {
  enabled: boolean;
  expiresAt: string | null;
  enabledBy: string | null;
  expired: boolean;
  maxHours: number;
}

const HOUR_CHOICES = [1, 8, 24, 72];

/**
 * Break-glass offline auth control.
 *
 * Arming lets EnrollPro-provisioned accounts sign in with a SORT-local offline
 * PIN while the identity provider is unreachable. It is deliberately explicit,
 * capped at 72 hours, audited, and auto-disabled once EnrollPro answers again —
 * so the control surface explains what it does rather than being a bare switch.
 */
export const AdminOfflineAuthPanel: React.FC = () => {
  const [status, setStatus] = useState<StatusShape | null>(null);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiService.getOfflineAuthStatus());
    } catch {
      /* the panel simply stays in its loading shape */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiService.enableOfflineAuth(hours);
      setNotice(`Offline sign-in armed for ${hours} hour${hours === 1 ? '' : 's'}. It disables itself once EnrollPro is reachable again.`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not enable offline sign-in.');
    }
    setBusy(false);
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiService.disableOfflineAuth();
      setNotice('Offline sign-in disabled. Every break-glass session was signed out.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not disable offline sign-in.');
    }
    setBusy(false);
  };

  const enabled = Boolean(status?.enabled);

  return (
    <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            enabled ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {enabled ? <ShieldAlert size={17} /> : <ShieldCheck size={17} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-[var(--text-strong)]">Break-glass offline sign-in</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-strong)]/70">
            Lets EnrollPro-provisioned accounts sign in with a SORT-local offline PIN while EnrollPro is
            unreachable. It never stores an EnrollPro password, is capped at 72 hours, is written to the
            audit log, and disables itself once EnrollPro answers again.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full border px-2.5 py-1 font-bold ${
                enabled
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {enabled ? 'ARMED' : 'DISABLED'}
            </span>
            {enabled && status?.expiresAt && (
              <span className="text-[var(--text-strong)]/60">
                until {new Date(status.expiresAt).toLocaleString()}
                {status.enabledBy ? ` · armed by ${status.enabledBy}` : ''}
              </span>
            )}
            {!enabled && status?.expired && (
              <span className="text-[var(--text-strong)]/60">previous window expired</span>
            )}
          </div>

          {enabled ? (
            <div className="mt-4">
              <Button variant="outline" onClick={handleDisable} disabled={busy}>
                {busy ? 'Disabling…' : 'Disable and sign out break-glass sessions'}
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-strong)]/70" htmlFor="offline-auth-hours">
                Arm for
              </label>
              <select
                id="offline-auth-hours"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="h-9 rounded-xl border border-[var(--primary)]/15 bg-white px-2.5 text-xs font-semibold text-[var(--text-strong)] outline-none focus:border-[var(--accent)]"
              >
                {HOUR_CHOICES.map((h) => (
                  <option key={h} value={h}>
                    {h} hour{h === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
              <Button onClick={handleEnable} disabled={busy}>
                {busy ? 'Arming…' : 'Arm offline sign-in'}
              </Button>
            </div>
          )}

          {error && <div className="mt-3"><FormBanner variant="error" title={error} /></div>}
          {notice && <div className="mt-3"><FormBanner variant="success" title={notice} /></div>}
        </div>
      </div>
    </div>
  );
};
