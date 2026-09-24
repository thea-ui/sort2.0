import React, { useEffect, useState } from 'react';
import { Palette, Building2, Save, RefreshCw, Image as ImageIcon, DownloadCloud } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { useTheme, defaultColors, isAchromaticColor } from '../../../../hooks/useTheme';
import { SystemSettings } from '../../../../types';
import { useToast } from '../../../../hooks/useToast';
import { LoadingState } from '../../../../components/common/LoadingState';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface BrandingForm {
  schoolName: string;
  schoolAcronym: string;
  schoolId: string;
  division: string;
  region: string;
  address: string;
  schoolHeadName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  goldColor: string;
}

const EMPTY_FORM: BrandingForm = {
  schoolName: '',
  schoolAcronym: '',
  schoolId: '',
  division: '',
  region: '',
  address: '',
  schoolHeadName: '',
  logoUrl: '',
  primaryColor: defaultColors.primary,
  accentColor: defaultColors.accent,
  goldColor: defaultColors.gold,
};

function fromSettings(settings: Partial<SystemSettings>): BrandingForm {
  return {
    schoolName: settings.schoolName ?? '',
    schoolAcronym: settings.schoolAcronym ?? '',
    schoolId: settings.schoolId ?? '',
    division: settings.division ?? '',
    region: settings.region ?? '',
    address: settings.address ?? '',
    schoolHeadName: settings.schoolHeadName ?? '',
    logoUrl: settings.logoUrl ?? '',
    primaryColor: settings.primaryColor ?? defaultColors.primary,
    accentColor: settings.accentColor ?? defaultColors.accent,
    goldColor: settings.goldColor ?? defaultColors.gold,
  };
}

const ColorField: React.FC<{
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, hint, value, onChange }) => (
  <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2">
    <p className="text-xs font-black text-[var(--text-strong)] uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={HEX_COLOR.test(value) ? value : defaultColors.primary}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 rounded-xl border border-gray-200 bg-white cursor-pointer p-1"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all ${
          HEX_COLOR.test(value)
            ? 'border-gray-200 focus:border-[var(--accent)] text-[var(--text-strong)]'
            : 'border-rose-300 text-rose-600'
        }`}
      />
    </div>
    <p className="text-[11px] text-[var(--text-strong)]/40 font-medium">{hint}</p>
  </div>
);

const TextField: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
  <div>
    <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase">{label}</label>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[var(--text-strong)] outline-none focus:border-[var(--accent)] transition-all"
    />
  </div>
);

export const AdminBrandingTab: React.FC = () => {
  const { refresh } = useTheme();
  const [form, setForm] = useState<BrandingForm>(EMPTY_FORM);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const toast = useToast();

  const showToast = (type: 'success' | 'error', message: string) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const loadSettings = async () => {
    const settings = await apiService.getSettings();
    if (settings && typeof settings === 'object') {
      setForm(fromSettings(settings));
      setSyncedAt(settings.enrollproBrandingSyncedAt ?? null);
    }
  };

  useEffect(() => {
    loadSettings()
      .catch((err) => console.warn('Failed to load branding settings:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validateColors = (): string | null => {
    for (const [key, label] of [
      ['primaryColor', 'Primary'],
      ['accentColor', 'Accent'],
      ['goldColor', 'Gold'],
    ] as const) {
      if (!HEX_COLOR.test(form[key])) return `${label} color must be a 6-digit hex value (e.g. #00A77C).`;
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const colorError = validateColors();
    if (colorError) {
      showToast('error', colorError);
      return;
    }

    setSaving(true);
    try {
      await apiService.updateSettings({
        schoolName: form.schoolName.trim() || 'School Name',
        schoolAcronym: form.schoolAcronym.trim() || null,
        schoolId: form.schoolId.trim() || null,
        division: form.division.trim() || null,
        region: form.region.trim() || null,
        address: form.address.trim() || null,
        schoolHeadName: form.schoolHeadName.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        primaryColor: form.primaryColor.toLowerCase(),
        secondaryColor: form.accentColor.toLowerCase(),
        accentColor: form.accentColor.toLowerCase(),
        goldColor: form.goldColor.toLowerCase(),
      });
      await refresh();
      showToast('success', 'Branding saved. Every open session updates live.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  const handlePullFromEnrollPro = async () => {
    setPulling(true);
    try {
      const result = await apiService.pullEnrollProBranding();
      await loadSettings();
      await refresh();
      showToast(
        'success',
        `Synced from EnrollPro (${result.colors.primary} / ${result.colors.secondary} / ${result.colors.accent})${result.logoUpdated ? ' with logo' : ''}.`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'EnrollPro branding sync failed. Kept the last-known branding.');
    } finally {
      setPulling(false);
    }
  };

  const previewPrimary = HEX_COLOR.test(form.primaryColor) ? form.primaryColor : defaultColors.primary;
  const rawAccent = HEX_COLOR.test(form.accentColor) ? form.accentColor : defaultColors.accent;
  const previewAccent = isAchromaticColor(rawAccent) ? previewPrimary : rawAccent;

  if (loading) {
    return <LoadingState label="Loading branding…" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-strong)] flex items-center gap-3">
            <Palette size={26} className="text-[var(--accent)]" />
            School Branding
          </h2>
          <p className="text-sm text-[var(--text-strong)]/50 mt-1">
            School identity and brand colors. Saved values apply to every session instantly.
          </p>
          <p className="text-xs text-[var(--text-strong)]/40 mt-1">
            Last EnrollPro sync: {syncedAt ? new Date(syncedAt).toLocaleString() : 'never'}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePullFromEnrollPro}
          disabled={pulling}
          className="px-4 py-2.5 bg-white border border-gray-200 text-[var(--text-strong)] rounded-2xl text-sm font-bold flex items-center gap-2 shadow-xs hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer transition-all"
        >
          {pulling ? <RefreshCw size={15} className="animate-spin" /> : <DownloadCloud size={15} />}
          Pull from EnrollPro
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-black text-[var(--text-strong)] uppercase tracking-wider flex items-center gap-2">
            <Building2 size={16} className="text-[var(--accent)]" /> School Identity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="School Name"
              value={form.schoolName}
              placeholder="Bagong Silang National High School"
              onChange={(v) => setField('schoolName', v)}
            />
            <TextField
              label="Acronym"
              value={form.schoolAcronym}
              placeholder="BSNHS"
              onChange={(v) => setField('schoolAcronym', v)}
            />
            <TextField label="School ID" value={form.schoolId} onChange={(v) => setField('schoolId', v)} />
            <TextField label="Division" value={form.division} onChange={(v) => setField('division', v)} />
            <TextField label="Region" value={form.region} onChange={(v) => setField('region', v)} />
            <TextField label="Address" value={form.address} onChange={(v) => setField('address', v)} />
            <TextField
              label="School Head"
              value={form.schoolHeadName}
              placeholder="Juan Dela Cruz"
              onChange={(v) => setField('schoolHeadName', v)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase flex items-center gap-1.5">
              <ImageIcon size={12} /> Logo URL
            </label>
            <input
              type="text"
              value={form.logoUrl}
              placeholder="/SORT_LOGO.png or a full https:// URL"
              onChange={(e) => setField('logoUrl', e.target.value)}
              className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[var(--text-strong)] outline-none focus:border-[var(--accent)] transition-all"
            />
            <p className="text-[11px] text-[var(--text-strong)]/40 font-medium mt-1">
              Used for the browser favicon. Relative paths resolve against this origin.
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-black text-[var(--text-strong)] uppercase tracking-wider flex items-center gap-2">
            <Palette size={16} className="text-[var(--accent)]" /> Brand Colors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorField
              label="Primary"
              hint="Evergreen text, headers and dark surfaces."
              value={form.primaryColor}
              onChange={(v) => setField('primaryColor', v)}
            />
            <ColorField
              label="Accent"
              hint="Action teal: buttons, links, active states."
              value={form.accentColor}
              onChange={(v) => setField('accentColor', v)}
            />
            <ColorField
              label="Gold"
              hint="Badges, ranks and achievements."
              value={form.goldColor}
              onChange={(v) => setField('goldColor', v)}
            />
          </div>

          <div className="rounded-2xl border border-[var(--primary)]/10 p-5 bg-[var(--background)]">
            <p className="text-xs font-black text-[var(--text-strong)]/50 uppercase tracking-wider mb-3">Live Preview</p>
            <div className="flex flex-wrap items-center gap-3">
              {/* Mirrors resolveThemeVariables: a gray/achromatic accent falls
                  back to the primary brand color, so the preview never shows a
                  washed-out button that the app would not actually render. */}
              <span
                className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: previewAccent }}
              >
                Action Button
              </span>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-black text-white shadow-sm"
                style={{ backgroundColor: previewPrimary }}
              >
                PRIMARY
              </span>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-black border"
                style={{
                  color: HEX_COLOR.test(form.goldColor) ? form.goldColor : defaultColors.gold,
                  borderColor: HEX_COLOR.test(form.goldColor) ? `${form.goldColor}55` : `${defaultColors.gold}55`,
                  backgroundColor: HEX_COLOR.test(form.goldColor) ? `${form.goldColor}14` : `${defaultColors.gold}14`,
                }}
              >
                GOLD BADGE
              </span>
              <span className="text-lg font-black text-[var(--text-strong)]">
                {form.schoolName || 'School Name'} | SORT
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[var(--accent)] hover:opacity-90 text-white rounded-2xl text-sm font-extrabold flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer transition-all"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Save Branding
          </button>
        </div>
      </form>
    </div>
  );
};
