import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDot?: boolean;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 24,
  color = '#007aff',
  fillOpacity = 0.1,
  showDot = true,
  className = '',
}) => {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padY = 2;
    const usableH = height - padY * 2;

    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: padY + usableH - ((v - min) / range) * usableH,
    }));

    const line = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    const fill = `${line} L${width},${height} L0,${height} Z`;

    return { line, fill, last: points[points.length - 1] };
  }, [data, width, height]);

  if (!path) return null;

  return (
    <svg width={width} height={height} className={`shrink-0 ${className}`} viewBox={`0 0 ${width} ${height}`}>
      <path d={path.fill} fill={color} opacity={fillOpacity} />
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && path.last && (
        <circle cx={path.last.x} cy={path.last.y} r="2.5" fill={color} />
      )}
    </svg>
  );
};
