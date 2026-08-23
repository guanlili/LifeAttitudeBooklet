import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import type { Entry } from '../api/types';
import StanceChip from '../components/StanceChip';
import { dimensionMeta } from '../lib/dimensions';
import { toast } from '../store/session';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export default function BookletEntry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ entry: Entry }>(`/booklet/entry/${id}`)
      .then((res) => setEntry(res.entry))
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'));
  }, [id]);

  const meta = entry ? dimensionMeta(entry.dimension) : null;

  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-paper/95 px-3 py-3 backdrop-blur">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        {entry && meta && (
          <span className="text-sm text-ink-soft">
            {meta.emoji} {meta.name}
          </span>
        )}
      </header>

      {entry && meta && (
        <article className="animate-rise-in px-6 pt-4">
          {/* 纸页质感排版 */}
          <div className="paper-card overflow-hidden">
            <div className={`h-1.5 w-full ${meta.barClass}`} />
            <div className="px-6 py-8">
              <h1 className="font-serif text-2xl font-bold leading-snug">{entry.title}</h1>
              <p className="mt-2 text-xs text-ink-soft">
                {formatDate(entry.createdAt)} · 深度 Lv.{entry.depthLevel}
              </p>

              <div className="mt-6 space-y-4 text-[15px] leading-loose text-ink">
                {entry.story
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="indent-[2em]">
                      {para}
                    </p>
                  ))}
              </div>

              {/* attitude 大字引用块 */}
              <blockquote className="mt-8 border-l-4 border-coral bg-coral/5 px-5 py-4 font-serif text-lg font-medium italic leading-relaxed">
                {entry.attitude}
              </blockquote>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <StanceChip stance={entry.stance} dimension={entry.dimension} />
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-paper-deep px-2.5 py-0.5 text-xs text-ink-soft"
                  >
                    # {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
