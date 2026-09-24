import React, { useMemo, useState } from 'react';
import { Award, Calendar, Clock, Loader2, Lock, Sparkles, Trophy } from 'lucide-react';
import { User, SystemSettings, Certificate } from '../../../types';
import { apiService } from '../../../services/api';
import { useCertificates } from '../../../hooks/useCertificates';
import { CertificateCard } from './CertificateCard';
import { CertificatePreviewModal } from './CertificatePreviewModal';

interface CertificateVaultProps {
  currentUser: User;
  settings?: SystemSettings | null;
  onClaimed?: () => void;
}

export const CertificateVault: React.FC<CertificateVaultProps> = ({ currentUser, settings, onClaimed }) => {
  const { certificates, termStatus, loading, claimMilestone, milestoneEarned, refresh } = useCertificates(currentUser.id);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [preview, setPreview] = useState<Certificate | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const threshold = settings?.certificatePointThreshold ?? 500;
  const eligibleMilestone = currentUser.points >= threshold;
  const ranked = useMemo(() => certificates.filter((c) => c.type === 'RANK'), [certificates]);
  const milestones = useMemo(() => certificates.filter((c) => c.type === 'MILESTONE'), [certificates]);

  const handleDownload = async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      await apiService.downloadCertificateById(cert.id, `${cert.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.warn('Download certificate error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleView = async (cert: Certificate) => {
    try {
      await apiService.viewCertificateById(cert.id);
    } catch (err) {
      console.warn('View certificate error:', err);
    }
  };

  const handleClaimMilestone = async () => {
    setClaiming(true);
    setNotice(null);
    try {
      const res = await claimMilestone();
      if (res?.alreadyClaimed) {
        setNotice('You have already claimed your Eco-Milestone certificate.');
      } else {
        setNotice('Eco-Milestone certificate claimed! It is now available in your vault.');
        onClaimed?.();
      }
      await refresh();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to claim milestone certificate.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Term status banner */}
      {termStatus && termStatus.state !== 'NO_TERM' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--text-strong)] border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[var(--text-strong)]">{termStatus.quarterName || 'Academic Term'}</p>
              <p className="text-[11px] text-[var(--text-strong)]/55 font-medium">
                {termStatus.state === 'IN_TERM' &&
                  `${termStatus.daysRemaining} day${termStatus.daysRemaining === 1 ? '' : 's'} left · Top-3 awards finalize after the term closes.`}
                {termStatus.state === 'GRACE' &&
                  `Term closed · Verifying late collections (${termStatus.graceDays}-day grace window).`}
                {termStatus.state === 'CLOSED' &&
                  (termStatus.resultsReady
                    ? 'Final standings locked · Top-3 certificates issued.'
                    : 'Final standings locked · Awaiting certificate issuance.')}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
              termStatus.state === 'IN_TERM'
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/25'
                : termStatus.state === 'GRACE'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {termStatus.state === 'IN_TERM' ? <Clock size={11} /> : <Lock size={11} />}
            {termStatus.state === 'IN_TERM' ? 'Ranked awards locked' : termStatus.state === 'GRACE' ? 'Grace period' : 'Term closed'}
          </span>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-[var(--text-strong)] text-xs font-semibold">
          {notice}
        </div>
      )}

      {/* Milestone claim */}
      <div className="bg-gradient-to-br from-[var(--gold)]/5 to-amber-50/50 border border-[var(--gold)]/20 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/25 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-strong)]">Eco-Milestone Certificate</h3>
              <p className="text-[11px] text-[var(--text-strong)]/55 font-medium">
                Reach {threshold} eco-points to claim instantly — no need to wait for the term to end.
              </p>
            </div>
          </div>
          {milestoneEarned ? (
            <span className="px-3 py-1.5 rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)] text-[10px] font-extrabold shrink-0">
              Claimed
            </span>
          ) : (
            <button
              type="button"
              onClick={handleClaimMilestone}
              disabled={!eligibleMilestone || claiming}
              className="px-4 py-2 rounded-xl bg-[var(--gold)] text-white text-[11px] font-extrabold shadow-sm hover:bg-[#b38a20] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
            >
              {claiming ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
              {eligibleMilestone ? 'Claim' : `${Math.max(0, threshold - currentUser.points)} pts to go`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-[var(--text-strong)]/40">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* Ranked certificates */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-[var(--gold)]" />
              <h3 className="text-sm font-extrabold text-[var(--text-strong)]">Term Ranked Awards</h3>
            </div>
            {ranked.length === 0 ? (
              <p className="text-[11px] text-[var(--text-strong)]/50 font-medium">
                {termStatus?.state === 'CLOSED'
                  ? 'No ranked award was issued to you for the last term.'
                  : 'Top 3 finishers receive Eco-Champion, Eco-Leader, and Eco-Advocate certificates once the term ends.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ranked.map((cert) => (
                  <CertificateCard
                    key={cert.id}
                    certificate={cert}
                    onDownload={handleDownload}
                    onView={handleView}
                    onSelect={setPreview}
                    downloading={downloading === cert.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Milestone certificates */}
          {milestones.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-[var(--gold)]" />
                <h3 className="text-sm font-extrabold text-[var(--text-strong)]">Milestone Certificates</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {milestones.map((cert) => (
                  <CertificateCard
                    key={cert.id}
                    certificate={cert}
                    onDownload={handleDownload}
                    onView={handleView}
                    onSelect={setPreview}
                    downloading={downloading === cert.id}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CertificatePreviewModal
        certificate={preview}
        onClose={() => setPreview(null)}
        onDownload={handleDownload}
        onView={handleView}
        downloading={!!preview && downloading === preview.id}
      />
    </div>
  );
};
