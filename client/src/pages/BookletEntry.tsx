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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ entry: Entry }>(`/booklet/entry/${id}`)
      .then((res) => setEntry(res.entry))
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const meta = entry ? dimensionMeta(entry.dimension) : null;

  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-cream/95 px-3 py-3 backdrop-blur">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
      {loading && (
        <div className="flex flex-col items-center gap-3 py-24">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
            <div className="h-full w-1/3 animate-[fade-in_1s_ease-in-out_infinite] bg-blue rounded-full" />
          </div>
          <p className="text-xs text-ink-4">加载中…</p>
        </div>
      )}

      {entry && meta && (
          <span className="text-sm text-ink-4">
            {meta.emoji} {meta.name}
          </span>
        )}
      </header>

      {entry && meta && (
        <article className="animate-rise-in px-6 pt-4">
          <div className="card overflow-hidden">
            <div className={`h-1.5 w-full ${meta.barClass}`} />
            <div className="px-6 py-8">
              <h1 className="text-2xl font-bold leading-snug text-ink">{entry.title}</h1>
              <p className="mt-2 text-xs text-ink-4">
                {formatDate(entry.createdAt)} · 深度 Lv.{entry.depthLevel}
              </p>

              <div className="mt-6 space-y-4 text-[15px] leading-loose text-ink-2">
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
              <blockquote className="mt-8 border-l-4 border-blue bg-blue/5 px-5 py-4 text-lg font-semibold leading-relaxed text-blue-deep">
                {entry.attitude}
              </blockquote>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <StanceChip stance={entry.stance} dimension={entry.dimension} />
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="tag bg-gray-blue font-semibold text-ink-3"
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
