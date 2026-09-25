import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

/**
 * App-modal body building blocks (SMART master handoff Part 3 §5).
 * Tint alphas are the reference values: `0A` ≈ 4% (InfoCard), `08`/`30`
 * ≈ 3%/19% (StatTile, StepCards).
 */

export type ModalTone = 'primary' | 'secondary' | 'accent';
export type AlertVariant = 'danger' | 'warning' | 'info';

const ALERT_CONFIG: Record<
  AlertVariant,
  { bg: string; border: string; text: string; iconBg: string; icon: typeof AlertTriangle }
> = {
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconBg: 'text-red-600',
    icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconBg: 'text-amber-600',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconBg: 'text-blue-600',
    icon: Info,
  },
};

export const InfoCard: React.FC<{
  tone?: ModalTone;
  label: string;
  children: React.ReactNode;
}> = ({ tone = 'primary', label, children }) => {
  const { colors } = useTheme();
  const color = colors[tone];
  return (
    <div className="p-4 rounded-xl min-w-0 shadow-sm" style={{ backgroundColor: `${color}0A` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>
        {label}
      </p>
      {children}
    </div>
  );
};

export const StatTile: React.FC<{
  tone?: ModalTone;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}> = ({ tone = 'secondary', icon, label, value, hint }) => {
  const { colors } = useTheme();
  const color = colors[tone];
  return (
    <div
      className="rounded-xl border-2 px-3 sm:px-4 py-2.5 sm:py-3 overflow-hidden"
      style={{ backgroundColor: `${color}08`, borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none">{value}</p>
      {hint && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
};

export const AlertBanner: React.FC<{
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
}> = ({ variant = 'warning', title, children }) => {
  const config = ALERT_CONFIG[variant];
  const Icon = config.icon;
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-2 ${config.bg} ${config.border} ${config.text} px-4 py-3`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.iconBg}`} />
      <div className="min-w-0">
        {title && <h4 className={`text-sm font-bold ${config.text}`}>{title}</h4>}
        <div className="text-xs leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

export const StepCards: React.FC<{
  steps: { title: string; hint?: string }[];
  tones?: ModalTone[];
}> = ({ steps, tones = ['primary', 'secondary', 'accent'] }) => {
  const { colors } = useTheme();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {steps.map((step, index) => {
        const color = colors[tones[index % tones.length]];
        return (
          <div
            key={step.title}
            className="p-3 rounded-xl border-2"
            style={{ backgroundColor: `${color}08`, borderColor: `${color}30` }}
          >
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white mb-2"
              style={{ backgroundColor: color }}
            >
              {index + 1}
            </span>
            <p className="text-sm font-semibold text-foreground leading-snug">{step.title}</p>
            {step.hint && <p className="text-xs text-muted-foreground mt-1">{step.hint}</p>}
          </div>
        );
      })}
    </div>
  );
};

export const ModalSection: React.FC<{
  title?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, badge, children }) => (
  <div className="bg-background border-2 border-border rounded-xl overflow-hidden">
    {(title || badge) && (
      <div className="px-4 py-3 border-b-2 border-border flex items-center justify-between gap-2">
        {title && <p className="font-bold text-foreground text-sm sm:text-base">{title}</p>}
        {badge}
      </div>
    )}
    {children}
  </div>
);
