import React from 'react';

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
  textClassName = 'text-xl font-heading font-black tracking-tight text-[#00271D]',
  subtitle
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 46;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Visual Logo Image - Large & Pleasing */}
      <div 
        className="relative shrink-0 flex items-center justify-center transition-transform duration-200 hover:scale-105"
        style={{ width: numericSize, height: numericSize }}
      >
        <img 
          src="/SORT_LOGO.png" 
          alt="S.O.R.T. Logo" 
          className="w-full h-full object-contain filter drop-shadow-sm" 
        />
      </div>

      {/* Brand Title & Subtitle */}
      {showText && (
        <div className="flex flex-col justify-center">
          <span className={textClassName}>S.O.R.T.</span>
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
