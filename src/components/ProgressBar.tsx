interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  max = 100,
  color = '#818CF8',
  height = 'h-1.5',
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-[#71717A]">Progress</span>
          <span className="text-xs text-[#A1A1AA]">{pct}%</span>
        </div>
      )}
      <div className={`w-full bg-[#1E1E1E] rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
