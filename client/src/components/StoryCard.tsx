import type { Entry } from '../api/types';
import { dimensionMeta } from '../lib/dimensions';
import StanceChip from './StanceChip';

interface StoryCardProps {
  entry: Entry;
  onClick?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}

/** 手帐纸页风格的故事卡 */
export default function StoryCard({ entry, onClick, onDelete, readonly = false }: StoryCardProps) {
  const meta = dimensionMeta(entry.dimension);
  return (
    <article
      className="paper-card card-interactive relative animate-rise-in overflow-hidden"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className={`h-1 w-full ${meta.barClass}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-[17px] font-semibold leading-snug">{entry.title}</h3>
          {!readonly && onDelete && (
            <button
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft/70 transition-colors hover:bg-paper-deep hover:text-coral-deep"
              aria-label="删除条目"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              ···
            </button>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft line-clamp-2">{entry.story}</p>
        <blockquote className="mt-3 border-l-2 border-coral/50 pl-3 font-serif text-[15px] italic leading-relaxed text-ink">
          {entry.attitude}
        </blockquote>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <StanceChip stance={entry.stance} dimension={entry.dimension} />
          <span className="text-xs text-ink-soft/70">
            {meta.emoji} {meta.name}
          </span>
        </div>
      </div>
    </article>
  );
}
