'use client';

interface FintechLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
}

export default function FintechLogo({
  className = '',
  size = 'md',
  showText = true,
  showSubtitle = false,
}: FintechLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icon Glyph with Red to Lilac Gradient */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E5092F] via-[#B5179E] to-[#8B5CF6] p-[2px] shadow-lg shadow-purple-950/40`}
      >
        <div className="w-full h-full bg-[#0B0B0F]/90 rounded-[14px] flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4"
          >
            <defs>
              <linearGradient id="fintechGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E5092F" />
                <stop offset="50%" stopColor="#C026D3" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            {/* Top wave of the F */}
            <path
              d="M18 20 C35 15, 70 12, 88 24 C82 35, 68 38, 48 37 L38 37 L34 52 L62 52 C58 62, 48 64, 30 64 L26 84 L14 84 Z"
              fill="url(#fintechGrad)"
            />
            {/* Lower accent slash */}
            <circle cx="76" cy="46" r="6" fill="#8B5CF6" opacity="0.9" />
          </svg>
        </div>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-tight">
            <span className={`${textSizes[size]} font-black text-white`}>FIN</span>
            <span className={`${textSizes[size]} font-black bg-gradient-to-r from-[#E5092F] to-[#8B5CF6] bg-clip-text text-transparent`}>
              TECH
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[11px] font-medium text-neutral-400 tracking-wider">
              Tu negocio, en control
            </span>
          )}
        </div>
      )}
    </div>
  );
}

