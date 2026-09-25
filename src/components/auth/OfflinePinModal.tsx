import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { AppModal } from '../common/AppModal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormBanner } from '../common/InlineBanner';
import { apiService } from '../../services/api';

interface OfflinePinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatusShape {
  hasOfflinePin: boolean;
  offlinePinSetAt: string | null;
  pinPolicy: { minLength: number; maxLength: number; digitsOnly: boolean };
  offlineSession: boolean;
  enabled: boolean;
}

/**
 * Self-service setup for the break-glass offline PIN. The PIN is a SORT-local
 * credential used only when EnrollPro is unreachable — it is deliberately
 * separate from (and never derived from) an EnrollPro password.
 */
export const OfflinePinModal: React.FC<OfflinePinModalProps> = ({ open, onOpenChange }) => {
  const [status, setStatus] = useState<StatusShape | null>(null);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiService.getOfflineAuthStatus());
    } catch {
      /* non-fatal: the form still works */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPin('');
    setConfirm('');
    setError(null);
    setSuccess(null);
    void load();
  }, [open, load]);

  const handleSave = async () => {
    if (pin !== confirm) {
      setError('The two PINs do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiService.setOfflinePin(pin);
      setSuccess('Offline PIN saved. Use it in the password field if EnrollPro is offline.');
      setPin('');
      setConfirm('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save the offline PIN.');
    }
    setBusy(false);
  };

  const handleRemove = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiService.clearOfflinePin();
      setSuccess('Offline PIN removed.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not remove the offline PIN.');
    }
    setBusy(false);
  };

  const policy = status?.pinPolicy ?? { minLength: 6, maxLength: 8, digitsOnly: true };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      icon={<KeyRound />}
      title="Offline PIN"
      description="A backup way to sign in when EnrollPro is offline."
      size="sm"
      hideFooter
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          EnrollPro verifies your normal password. If it is unreachable, your{' '}
          <span className="font-semibold text-foreground">offline PIN</span> lets you keep working. It is
          stored only as a one-way hash, is never your EnrollPro password, and is ignored while EnrollPro
          is online.
        </p>

        {status?.offlineSession && (
          <FormBanner
            variant="error"
            title="You are signed in with an offline PIN already. Sign in normally once EnrollPro is reachable to change it."
          />
        )}

        {error && <FormBanner variant="error" title={error} />}
        {success && <FormBanner variant="success" title={success} />}

        {!status?.offlineSession && (
          <>
            <p className="text-xs font-semibold text-muted-foreground">
              {status?.hasOfflinePin
                ? `Current PIN set${status.offlinePinSetAt ? ` on ${new Date(status.offlinePinSetAt).toLocaleDateString()}` : ''}. Enter a new one to replace it.`
                : 'No offline PIN set yet.'}{' '}
              Use {policy.minLength}-{policy.maxLength} digits.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="New PIN"
                value={pin}
                maxLength={policy.maxLength}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Confirm PIN"
                value={confirm}
                maxLength={policy.maxLength}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {status?.hasOfflinePin && (
                <Button variant="outline" onClick={handleRemove} disabled={busy}>
                  Remove PIN
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={busy || pin.length < policy.minLength}
              >
                {busy ? 'Saving…' : 'Save PIN'}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppModal>
  );
};
