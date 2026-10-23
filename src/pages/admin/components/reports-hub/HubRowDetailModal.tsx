import React, { useEffect } from 'react';
import { CheckCircle2, Clock, Eye, MapPin, X } from 'lucide-react';
import { ModalPortal } from '../../../../components/common/ModalPortal';
import type { HubRowDetail, HubRowDetailField } from './hubRowDetails';

interface HubRowDetailModalProps {
  detail: HubRowDetail | null;
  onClose: () => void;
}

/** Status pill recipes, mirroring the report inspect modal's states. */
const STATUS_PILL: Record<string, { className: string; icon: React.ReactNode }> = {
  pending: { className: 'bg-amber-100 text-amber-900 border border-amber-200', icon: <Clock size={9} /> },
  dispatched: { className: 'bg-sky-100 text-sky-800 border border-sky-200', icon: <Clock size={9} /> },
  collected: { className: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: <CheckCircle2 size={9} /> },
  resolved: { className: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: <CheckCircle2 size={9} /> },
  dismissed: { className: 'bg-rose-100 text-rose-800 border border-rose-200', icon: <X size={9} /> },
  expired: { className: 'bg-rose-100 text-rose-800 border border-rose-200', icon: <Clock size={9} /> },
};

const URGENCY_PILL: Record<string, string> = {
  high: 'bg-rose-100 text-rose-800 border border-rose-200',
  medium: 'bg-amber-100 text-amber-900 border border-amber-200',
  low: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
};

const FieldValue: React.FC<{ field: HubRowDetailField }> = ({ field }) => {
  const key = field.label.trim().toLowerCase();
  const value = field.value.trim();

  if (key === 'urgency' && URGENCY_PILL[value.toLowerCase()]) {
    return (
      <span
        className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${URGENCY_PILL[value.toLowerCase()]}`}
      >
        {field.value}
      </span>
    );
  }

  if (key === 'report id') {
    return <span className="font-mono text-[11px] font-semibold break-all">{field.value}</span>;
  }

  return <span className="break-words">{field.value}</span>;
};

/**
 * Read-only pop-up with every field of a report / sale / turnover row — styled
 * like the report inspect modal: ID + status chips and the title up top, the
 * record's location as the hero banner, and the remaining fields in a card.
 */
export const HubRowDetailModal: React.FC<HubRowDetailModalProps> = ({ detail, onClose }) => {
  useEffect(() => {
    if (!detail) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detail, onClose]);

  if (!detail) return null;

  const fields = detail.fields;
  const idField = fields.find((field) => field.label.trim().toLowerCase() === 'report id');
  const statusField = fields.find((field) => field.label.trim().toLowerCase() === 'status');
  const locationField = fields.find((field) => field.label.trim().toLowerCase() === 'location');
  const skip = new Set([idField, statusField, locationField].filter(Boolean));
  const restFields = fields.filter((field) => !skip.has(field));
  const statusPill = statusField ? STATUS_PILL[statusField.value.trim().toLowerCase()] : undefined;

  return (
    <ModalPortal>
      <div
        data-testid="modal-overlay"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in print-hide"
        onClick={onClose}
      >
        <div
          data-testid="modal-panel"
          role="dialog"
          aria-modal="true"
          className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 relative my-auto max-h-[92dvh] overflow-y-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close record details"
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-20"
          >
            <X size={18} />
          </button>

          {/* Header: chips + title */}
          <div className="flex items-start gap-3 border-b border-gray-100 pb-3 pr-8">
            <div className="h-11 w-11 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_15%,white)] text-[var(--accent)] flex items-center justify-center font-bold shrink-0">
              <Eye size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {idField && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[var(--primary)] text-white font-mono break-all">
                    ID: {idField.value}
                  </span>
                )}
                {statusField && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      statusPill?.className ?? 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {statusPill?.icon} {statusField.value}
                  </span>
                )}
              </div>
              <h3 className="text-base font-heading font-black text-[var(--text-strong)] leading-snug break-words">
                {detail.title}
              </h3>
              {detail.subtitle && (
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{detail.subtitle}</p>
              )}
            </div>
          </div>

          {/* Hero banner: the record's location */}
          {locationField && (
            <div className="bg-[color-mix(in_srgb,var(--accent)_10%,white)] border border-[var(--accent)]/30 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider block">
                  {locationField.label}
                </span>
                <h4 className="text-lg font-heading font-black text-[var(--text-strong)] leading-tight mt-0.5 break-words">
                  {locationField.value}
                </h4>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-xs">
                <MapPin size={22} />
              </div>
            </div>
          )}

          {/* Remaining fields */}
          {restFields.length > 0 && (
            <div className="bg-[var(--background)] p-3.5 rounded-2xl border border-[var(--primary)]/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {restFields.map((field) => (
                <div key={field.label} className="min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    {field.label}
                  </span>
                  <span className="font-bold text-[var(--text-strong)] flex items-center gap-1.5 mt-1 text-xs">
                    <FieldValue field={field} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
