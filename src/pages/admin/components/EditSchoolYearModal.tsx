import React, { useState, useRef, useEffect } from 'react';
import { X, Pencil, Loader2 } from 'lucide-react';
import { SchoolYear } from '../../../hooks/useSchoolYear';

interface EditSchoolYearModalProps {
  isOpen: boolean;
  schoolYear: SchoolYear | null;
  onClose: () => void;
  onSubmit: (id: string, data: { label?: string; startDate?: string; endDate?: string }) => Promise<void>;
}

export const EditSchoolYearModal: React.FC<EditSchoolYearModalProps> = ({ isOpen, schoolYear, onClose, onSubmit }) => {
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && schoolYear) {
      setLabel(schoolYear.label);
      setStartDate(schoolYear.startDate.slice(0, 10));
      setEndDate(schoolYear.endDate.slice(0, 10));
      setFieldErrors({});
      setApiError(null);
      setSubmitting(false);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, schoolYear]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !schoolYear) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      errors.label = 'Label is required';
    } else if (!/^\d{4}-\d{4}$/.test(trimmedLabel)) {
      errors.label = 'Format: YYYY-YYYY (e.g. 2026-2027)';
    } else {
      const parts = trimmedLabel.split('-');
      const startYear = parseInt(parts[0], 10);
      const endYear = parseInt(parts[1], 10);
      if (endYear !== startYear + 1) {
        errors.label = 'Second year must be first year + 1';
      }
    }

    if (!startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!endDate) {
      errors.endDate = 'End date is required';
    }
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      errors.endDate = 'End date must be after start date';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !schoolYear) return;

    setSubmitting(true);
    setApiError(null);
    try {
      await onSubmit(schoolYear.id, {
        label: label.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      onClose();
    } catch (err: any) {
      setApiError(err.message || 'Failed to update school year');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#00271D]/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="Edit School Year"
      >
        <div className="bg-gradient-to-br from-[#00271D] to-[#003a2b] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-[#00A77C]" />
            <div>
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Edit School Year</span>
              <h3 className="text-base font-bold text-white">SY {schoolYear.label}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-white/40 hover:text-white cursor-pointer" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">
              {apiError}
            </div>
          )}

          {schoolYear.enrollproId && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-700">
              Linked to EnrollPro ID: <strong>{schoolYear.enrollproId}</strong>. The EnrollPro link cannot be changed.
            </div>
          )}

          <div>
            <label htmlFor="edit-sy-label" className="text-xs font-bold text-[#00271D] block mb-1">
              Label <span className="text-rose-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="edit-sy-label"
              type="text"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setFieldErrors((p) => ({ ...p, label: '' })); }}
              placeholder="2026-2027"
              className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-colors ${
                fieldErrors.label ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-gray-200 focus:border-[#00A77C] focus:ring-1 focus:ring-[#00A77C]'
              }`}
              aria-invalid={!!fieldErrors.label}
              aria-describedby={fieldErrors.label ? 'edit-sy-label-error' : undefined}
            />
            {fieldErrors.label && (
              <p id="edit-sy-label-error" className="text-[11px] text-rose-600 mt-1" role="alert">{fieldErrors.label}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-sy-start" className="text-xs font-bold text-[#00271D] block mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-sy-start"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setFieldErrors((p) => ({ ...p, startDate: '' })); }}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-colors ${
                  fieldErrors.startDate ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-gray-200 focus:border-[#00A77C] focus:ring-1 focus:ring-[#00A77C]'
                }`}
                aria-invalid={!!fieldErrors.startDate}
              />
              {fieldErrors.startDate && (
                <p className="text-[11px] text-rose-600 mt-1" role="alert">{fieldErrors.startDate}</p>
              )}
            </div>
            <div>
              <label htmlFor="edit-sy-end" className="text-xs font-bold text-[#00271D] block mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-sy-end"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setFieldErrors((p) => ({ ...p, endDate: '' })); }}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none transition-colors ${
                  fieldErrors.endDate ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' : 'border-gray-200 focus:border-[#00A77C] focus:ring-1 focus:ring-[#00A77C]'
                }`}
                aria-invalid={!!fieldErrors.endDate}
              />
              {fieldErrors.endDate && (
                <p className="text-[11px] text-rose-600 mt-1" role="alert">{fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
