import React, { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { DEFAULT_BRAND_LOGO, resolveBrandIdentity } from '../../utils/brandIdentity';

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
  const { schoolName, schoolAcronym, logoUrl, brandingSource } = useTheme();
  const [logoFailed, setLogoFailed] = useState(false);
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 46;

  // Tenant branding: the school logo synced from EnrollPro wins; the bundled
  // SORT mark is the fresh-deployment default and the on-error fallback.
  const identity = resolveBrandIdentity({ schoolName, schoolAcronym, logoUrl, brandingSource });
  const logoSrc = logoFailed ? DEFAULT_BRAND_LOGO : identity.logoSrc;
  const displayName = identity.displayName;

  // A live branding change (SSE) must retry the image instead of sticking on
  // a previous failure.
  useEffect(() => {
    setLogoFailed(false);
  }, [identity.logoSrc]);

  // Long school names step down in size and wrap over as many lines as needed
  // so the full name is always visible instead of being clipped.
  const nameSizeClass =
    displayName.length > 20 ? 'text-sm' : displayName.length > 12 ? 'text-base' : 'text-xl';

  return (
    <div className={`inline-flex min-w-0 max-w-full items-center gap-2 sm:gap-3 ${className}`}>
      {/* Visual Logo Image - Large & Pleasing */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-200 hover:scale-105"
        style={{ width: numericSize, height: numericSize }}
      >
        <img
          src={logoSrc}
          alt={identity.hasTenantLogo && !logoFailed ? `${displayName} logo` : 'S.O.R.T. Logo'}
          onError={() => setLogoFailed(true)}
          className="w-full h-full object-contain filter drop-shadow-sm"
        />
      </div>

      {/* Brand Title & Subtitle */}
      {showText && (
        <div className="flex min-w-0 max-w-full flex-col justify-center">
          <span className={`${textClassName} ${nameSizeClass} leading-tight break-words`}>
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
