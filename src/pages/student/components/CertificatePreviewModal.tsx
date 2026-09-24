import React from 'react';
import { X, Download, Eye, Calendar, Hash, Trophy } from 'lucide-react';
import { Certificate } from '../../../types';
import { CERT_TIER_META } from './CertificateCard';

interface CertificatePreviewModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onDownload?: (certificate: Certificate) => void;
  onView?: (certificate: Certificate) => void;
  downloading?: boolean;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  certificate,
  onClose,
  onDownload,
  onView,
  downloading = false,
}) => {
  if (!certificate) return null;

  const meta = CERT_TIER_META[certificate.tier];
  const { Icon } = meta;
  const awarded = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-white overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-24 bg-gradient-to-br ${meta.gradient} relative flex items-center justify-center`}>
          <Icon size={40} className="text-white/90" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
            aria-label="Close certificate preview"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold border ${meta.chip}`}>
              <Trophy size={11} />
              {meta.label}
            </span>
            <h3 className="text-lg font-heading font-black text-[var(--text-strong)] mt-2">{certificate.name}</h3>
            <p className="text-[11px] text-[var(--text-strong)]/50 font-medium mt-0.5">{meta.blurb}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--primary)]/10">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">Eco-Points</p>
              <p className="font-extrabold text-[var(--accent)] mt-0.5">{certificate.pointsAtIssue} pts</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--primary)]/10">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">
                {certificate.type === 'RANK' ? 'Final Rank' : 'Award Type'}
              </p>
              <p className="font-extrabold text-[var(--gold)] mt-0.5">
                {certificate.type === 'RANK' ? `Rank #${certificate.rankAtIssue ?? '-'}` : 'Milestone'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] text-[var(--text-strong)]/70">
            {certificate.termName && (
              <p className="flex items-center gap-1.5">
                <Calendar size={12} className="text-[var(--text-strong)]/40" />
                {certificate.termName}
                {certificate.schoolYearLabel ? ` · SY ${certificate.schoolYearLabel}` : ''}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <Calendar size={12} className="text-[var(--text-strong)]/40" />
              Conferred on {awarded}
            </p>
            <p className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-strong)]/50">
              <Hash size={12} className="text-[var(--text-strong)]/40" />
              {certificate.serial}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onView && (
              <button
                type="button"
                onClick={() => onView(certificate)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-[var(--accent)] text-xs font-bold hover:bg-[var(--accent)]/20 transition-colors cursor-pointer"
              >
                <Eye size={14} />
                Open PDF
              </button>
            )}
            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(certificate)}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--gold)] text-white text-xs font-bold hover:bg-[#b38a20] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download size={14} />
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
