import { dimensionMeta } from '../lib/dimensions';

interface StanceChipProps {
  stance: string;
  dimension: string;
  className?: string;
}

/** 立场胶囊 chip，按维度微调色相 */
export default function StanceChip({ stance, dimension, className = '' }: StanceChipProps) {
  const meta = dimensionMeta(dimension);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.chipClass} ${className}`}
    >
      {stance}
    </span>
  );
}
