import { dimensionMeta } from '../lib/dimensions';

interface StanceChipProps {
  stance: string;
  dimension: string;
  className?: string;
}

export default function StanceChip({ stance, dimension, className = '' }: StanceChipProps) {
  const meta = dimensionMeta(dimension);
  return (
    <span className={`tag font-semibold ${meta.chipClass} ${className}`}>
      {stance}
    </span>
  );
}
