import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { resolveBrandIdentity } from '../../utils/brandIdentity';

interface LoadingScreenProps {
  label?: string;
}

/**
 * Full-page branded boot screen. Used for the auth/session gate, lazy route
 * chunks, and the initial hydration window so every role sees the same
 * animated loading state instead of a blank page on reload.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  label = 'Loading…',
}) => {
  const { schoolName, schoolAcronym, logoUrl, brandingSource } = useTheme();
  const identity = resolveBrandIdentity({ schoolName, schoolAcronym, logoUrl, brandingSource });

  return (
    <div className="sort-boot" role="status" aria-live="polite" aria-label="Loading">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="sort-boot-mark">
          <span className="sort-boot-ring" aria-hidden="true" />
          <img src={identity.logoSrc} alt="" className="h-11 w-11 object-contain" />
        </div>

        <div>
          <p className="text-[13px] font-bold tracking-tight text-[var(--text-strong)]">
            {identity.displayName}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[var(--text-strong)]/50">{label}</p>
        </div>
      </div>
    </div>
  );
};
