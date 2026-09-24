import React from 'react';
import { Award, Download, Eye, Loader2, Medal, Trophy, Leaf } from 'lucide-react';
import { Certificate, CertificateTier } from '../../../types';

export interface CertificateTierMeta {
  label: string;
  blurb: string;
  gradient: string;
  ring: string;
  text: string;
  chip: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const CERT_TIER_META: Record<CertificateTier, CertificateTierMeta> = {
  CHAMPION: {
    label: 'Eco-Champion',
    blurb: 'Rank 1 — highest term eco-points',
    gradient: 'from-amber-400 to-orange-500',
    ring: 'border-amber-300',
    text: 'text-amber-700',
    chip: 'bg-amber-100 border-amber-300 text-amber-800',
    Icon: Trophy,
  },
  LEADER: {
    label: 'Eco-Leader',
    blurb: 'Rank 2 — runner-up of the term',
    gradient: 'from-[var(--primary)] to-[var(--primary)]',
    ring: 'border-[var(--primary)]/25',
    text: 'text-[var(--text-strong)]',
    chip: 'bg-[var(--primary)]/10 border-[var(--primary)]/25 text-[var(--text-strong)]',
    Icon: Award,
  },
  ADVOCATE: {
    label: 'Eco-Advocate',
    blurb: 'Rank 3 — podium finisher of the term',
    gradient: 'from-[var(--gold)] to-[var(--primary)]',
    ring: 'border-[var(--gold)]/25',
    text: 'text-[var(--gold)]',
    chip: 'bg-[var(--gold)]/10 border-[var(--gold)]/25 text-[var(--gold)]',
    Icon: Medal,
  },
  MILESTONE: {
    label: 'Eco-Milestone',
    blurb: 'Reached the eco-points threshold',
    gradient: 'from-[var(--gold)] to-[var(--primary)]',
    ring: 'border-[var(--gold)]/30',
    text: 'text-[var(--gold)]',
    chip: 'bg-[var(--gold)]/15 border-[var(--gold)]/30 text-[var(--gold)]',
    Icon: Leaf,
  },
};

interface CertificateCardProps {
  certificate: Certificate;
  onDownload?: (certificate: Certificate) => void;
  onView?: (certificate: Certificate) => void;
  onSelect?: (certificate: Certificate) => void;
  downloading?: boolean;
  compact?: boolean;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  onDownload,
  onView,
  onSelect,
  downloading = false,
  compact = false,
}) => {
  const meta = CERT_TIER_META[certificate.tier];
  const { Icon } = meta;

  return (
    <div
      className={`relative bg-white rounded-2xl border ${meta.ring} shadow-sm overflow-hidden flex flex-col ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.gradient}`} />
      <button
        type="button"
        onClick={() => onSelect?.(certificate)}
        className={`flex items-start gap-3 text-left w-full ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.chip}`}>
            {meta.label}
          </span>
          <h4 className="text-xs font-extrabold text-[var(--text-strong)] mt-1.5 leading-tight truncate">{certificate.name}</h4>
          <p className="text-[10px] text-[var(--text-strong)]/50 font-medium mt-0.5">
            {certificate.type === 'RANK'
              ? `Rank #${certificate.rankAtIssue ?? '-'} · ${certificate.pointsAtIssue} pts`
              : `${certificate.pointsAtIssue} pts`}
            {certificate.termName ? ` · ${certificate.termName}` : ''}
          </p>
          <p className="text-[10px] text-[var(--text-strong)]/40 font-mono mt-1 truncate">{certificate.serial}</p>
        </div>
      </button>

      {(onDownload || onView) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {onView && (
            <button
              type="button"
              onClick={() => onView(certificate)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-[var(--accent)] text-[11px] font-bold hover:bg-[var(--accent)]/20 transition-colors cursor-pointer"
            >
              <Eye size={12} />
              View
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(certificate)}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/25 text-[var(--gold)] text-[11px] font-bold hover:bg-[var(--gold)]/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Download
            </button>
          )}
        </div>
      )}
    </div>
  );
};
