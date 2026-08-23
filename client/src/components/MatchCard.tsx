import type { Recommendation } from '../api/types';
import { dimensionMeta } from '../lib/dimensions';
import Avatar from './Avatar';

interface MatchCardProps {
  rec: Recommendation;
  onViewBooklet: () => void;
  onConnect: () => void;
  connecting?: boolean;
}

export default function MatchCard({ rec, onViewBooklet, onConnect, connecting }: MatchCardProps) {
  const { user, score, reasons, sharedDimensions, previewEntries } = rec;
  return (
    <article className="paper-card card-interactive animate-rise-in p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full shadow-sm ring-2 ring-white/80">
          <Avatar emoji={user.avatarEmoji} color={user.avatarColor} size="lg" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg font-semibold">{user.nickname}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {[user.age ? `${user.age} 岁` : '', user.city].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <div className="font-serif text-3xl font-bold leading-none tracking-tight text-coral">
            {Math.round(score * 100)}%
          </div>
          <div className="mt-1 text-xs text-ink-soft">同频</div>
        </div>
      </div>

      {sharedDimensions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sharedDimensions.map((d) => {
            const meta = dimensionMeta(d);
            return (
              <span
                key={d}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chipClass}`}
              >
                {meta.emoji} {meta.name}
              </span>
            );
          })}
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-teal" />
              {r}
            </li>
          ))}
        </ul>
      )}

      {previewEntries.length > 0 && (
        <div className="mt-3 space-y-2">
          {previewEntries.slice(0, 2).map((e) => (
            <div key={e.id} className="rounded-xl border border-ink/5 bg-paper-deep/60 px-3 py-2.5">
              <div className="font-serif text-sm font-medium">{e.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft line-clamp-2">
                {e.attitude || e.story}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button className="btn-ghost flex-1 text-sm" onClick={onViewBooklet}>
          查看 TA 的册子
        </button>
        <button className="btn-primary flex-1 text-sm" onClick={onConnect} disabled={connecting}>
          {connecting ? '连接中…' : '打个招呼'}
        </button>
      </div>
    </article>
  );
}
