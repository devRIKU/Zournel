import React from 'react';

interface SquigglyLineProps {
  className?: string;
  color?: string;
  height?: number;
  width?: number | string;
  strokeWidth?: number;
  wavelength?: number;
}

export const SquigglyLine: React.FC<SquigglyLineProps> = ({
  className = '',
  color = 'currentColor',
  height = 5,
  strokeWidth = 1.1,
  wavelength = 8,
}) => {
  const rawId = React.useId();
  const patternId = `sq-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const midY = height / 2;
  const quarterW = wavelength / 4;
  const halfW = wavelength / 2;
  // A tiny amplitude wave for smooth, crisp rendering
  const amplitudeOffset = Math.max(1, midY - 1);
  const peakY = midY - amplitudeOffset;

  return (
    <svg
      className={`overflow-hidden inline-block ${className}`}
      height={height}
      style={{ width: '100%', minWidth: '16px', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          width={wavelength}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M 0 ${midY} Q ${quarterW} ${peakY}, ${halfW} ${midY} T ${wavelength} ${midY}`}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${patternId})`} />
    </svg>
  );
};

interface DottedLineProps {
  className?: string;
  color?: string;
  dotSize?: number;
  spacing?: number;
}

export const DottedLine: React.FC<DottedLineProps> = ({
  className = '',
  color = 'currentColor',
  dotSize = 2,
  spacing = 6,
}) => {
  return (
    <div
      className={`w-full h-[2px] opacity-40 ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, ${color} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing}px 2px`,
        backgroundRepeat: 'repeat-x',
      }}
      aria-hidden="true"
    />
  );
};

export const DoodleAccent: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      className={`inline-block ${className}`}
      width="24"
      height="12"
      viewBox="0 0 24 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 9C7 3 17 2 22 7C19 11 12 11 8 8C5 5 13 3 17 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
