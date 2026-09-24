import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface SortLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
}

export const SortLogo: React.FC<SortLogoProps> = ({
  size = 46,
  className = '',
  showText = true,
  textClassName = 'font-heading font-black tracking-tight text-[var(--text-strong)]',
  subtitle
}) => {
  const { logoUrl, schoolName } = useTheme();
  const [logoFailed, setLogoFailed] = useState(false);
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 46;

  // Tenant branding: the school logo synced from EnrollPro wins; the bundled
  // SORT mark is the pre-sync fallback and the on-error fallback (a broken
  // logo URL must never render the browser's broken-image glyph).
  const logoSrc = logoUrl && !logoFailed ? logoUrl : '/SORT_LOGO.png';
  const displayName = schoolName || 'S.O.R.T.';
  // Long school names wrap to two lines at a smaller size instead of truncating.
  const nameSizeClass =
    displayName.length > 20 ? 'text-sm' : displayName.length > 12 ? 'text-base' : 'text-xl';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Visual Logo Image - Large & Pleasing */}
      <div 
        className="relative shrink-0 flex items-center justify-center transition-transform duration-200 hover:scale-105"
        style={{ width: numericSize, height: numericSize }}
      >
        <img 
          src={logoSrc} 
          alt={schoolName ? `${schoolName} logo` : 'S.O.R.T. Logo'} 
          onError={() => setLogoFailed(true)}
          className="w-full h-full object-contain filter drop-shadow-sm" 
        />
      </div>

      {/* Brand Title & Subtitle */}
      {showText && (
        <div className="flex flex-col justify-center min-w-0">
          <span className={`${textClassName} ${nameSizeClass} leading-tight line-clamp-2 max-w-[190px]`}>
            {displayName}
          </span>
          {subtitle && (
            <span className="text-[11px] font-semibold text-gray-400 leading-none mt-0.5 tracking-wide">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
