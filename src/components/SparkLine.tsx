interface SparkLineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export default function SparkLine({ data, color = '#818CF8', height = 28, width = 60 }: SparkLineProps) {
  if (data.length < 2) return <div style={{ width, height }} />;

  const nonZero = data.filter(v => v > 0);
  if (nonZero.length === 0) return <div style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastPt = points[points.length - 1].split(',');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="2.5" fill={color} />
    </svg>
  );
}
