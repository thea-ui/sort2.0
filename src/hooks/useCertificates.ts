import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Certificate, TermStatus } from '../types';

export interface UseCertificatesResult {
  certificates: Certificate[];
  termStatus: TermStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  claimMilestone: () => Promise<{ alreadyClaimed: boolean } | null>;
  milestoneEarned: boolean;
}

export function useCertificates(userId: string | undefined): UseCertificatesResult {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [termStatus, setTermStatus] = useState<TermStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [certs, status] = await Promise.all([
        apiService.getUserCertificates(userId).catch(() => [] as Certificate[]),
        apiService.getTermStatus().catch(() => null),
      ]);
      setCertificates(Array.isArray(certs) ? certs : []);
      setTermStatus(status);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claimMilestone = useCallback(async () => {
    if (!userId) return null;
    const res = await apiService.claimMilestoneCertificate(userId);
    await refresh();
    return { alreadyClaimed: !!res?.alreadyClaimed };
  }, [userId, refresh]);

  const milestoneEarned = certificates.some((c) => c.tier === 'MILESTONE');

  return { certificates, termStatus, loading, error, refresh, claimMilestone, milestoneEarned };
}
