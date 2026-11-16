import React from 'react';

interface JKLULogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const JKLULogo: React.FC<JKLULogoProps> = ({ size = 'md', showText = true }) => {
  const dimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 44, height: 44 },
    lg: { width: 64, height: 64 },
  }[size];

  return (
    <div className="flex items-center gap-3">
      {/* Official JKLU Emblem SVG */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <circle cx="100" cy="100" r="96" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
        
        {/* Blue Lotus Petals */}
        {/* Outer bottom petals */}
        <path
          d="M36 122 C 60 148, 140 148, 164 122 C 140 134, 60 134, 36 122 Z"
          fill="#0284C7"
        />
        {/* Lower side left petal */}
        <path
          d="M44 116 C 68 126, 92 118, 100 132 C 80 128, 56 126, 44 116 Z"
          fill="#0369A1"
        />
        {/* Lower side right petal */}
        <path
          d="M156 116 C 132 126, 108 118, 100 132 C 120 128, 144 126, 156 116 Z"
          fill="#0369A1"
        />
        {/* Main Lotus Wings */}
        <path
          d="M40 112 C 70 85, 95 110, 100 126 C 92 104, 65 92, 40 112 Z"
          fill="#38BDF8"
        />
        <path
          d="M160 112 C 130 85, 105 110, 100 126 C 108 104, 135 92, 160 112 Z"
          fill="#38BDF8"
        />
        {/* Inner blue petals cradling the flame */}
        <path
          d="M68 116 C 85 96, 98 106, 100 124 C 95 108, 80 102, 68 116 Z"
          fill="#0284C7"
        />
        <path
          d="M132 116 C 115 96, 102 106, 100 124 C 105 108, 120 102, 132 116 Z"
          fill="#0284C7"
        />

        {/* Central Rising Flame */}
        <path
          d="M100 52 C 114 74, 118 90, 114 104 C 110 116, 98 124, 100 124 C 102 124, 90 116, 86 104 C 82 90, 86 74, 100 52 Z"
          fill="url(#jklu_flame_grad)"
        />
        <path
          d="M100 66 C 108 82, 110 94, 106 104 C 103 112, 97 116, 100 116 C 101 116, 95 110, 94 102 C 92 92, 94 80, 100 66 Z"
          fill="#FDE047"
        />

        {/* Sanskrit Motto: ज्ञानम् अमृतम् */}
        <text
          x="100"
          y="152"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fontFamily="serif, 'Noto Sans Devanagari', 'Mangal'"
          fill="#0F172A"
          letterSpacing="1"
        >
          ज्ञानम् अमृतम्
        </text>

        {/* Bold Serif JKLU Wordmark */}
        <text
          x="100"
          y="185"
          textAnchor="middle"
          fontSize="30"
          fontWeight="900"
          fontFamily="'Times New Roman', Georgia, serif"
          fill="#0F172A"
          letterSpacing="4"
        >
          JKLU
        </text>

        <defs>
          <linearGradient id="jklu_flame_grad" x1="100" y1="50" x2="100" y2="124" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F97316" />
            <stop offset="0.6" stopColor="#EA580C" />
            <stop offset="1" stopColor="#C2410C" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-slate-900 font-serif">
              JK LAKSHMIPAT UNIVERSITY
            </span>
          </div>
          <div className="text-[11px] font-semibold text-red-700 tracking-wide uppercase">
            Hostel Management System
          </div>
        </div>
      )}
    </div>
  );
};
