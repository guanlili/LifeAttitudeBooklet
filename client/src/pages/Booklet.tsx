import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { BookletRes, Entry } from '../api/types';
import StoryCard from '../components/StoryCard';
import EmptyState from '../components/EmptyState';
import { DIMENSIONS, dimensionMeta } from '../lib/dimensions';
import { toast } from '../store/session';

export default function Booklet() {
  const navigate = useNavigate();
  const [data, setData] = useState<BookletRes | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<BookletRes>('/booklet')
      .then(setData)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'));
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete<{ ok: boolean }>(`/booklet/entry/${deleting.id}`);
      setData((prev) =>
        prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== deleting.id) } : prev,
      );
      toast('已从册子中移除');
      setDeleting(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusy(false);
    }
  };

  const entries = data?.entries ?? [];
  const grouped = DIMENSIONS.map((d) => ({
    meta: d,
    list: entries.filter((e) => e.dimension === d.key),
  })).filter((g) => g.list.length > 0);
  // 未知维度兜底分组
  const knownKeys = new Set(DIMENSIONS.map((d) => d.key as string));
  const others = entries.filter((e) => !knownKeys.has(e.dimension));

  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="animate-rise-in font-serif text-2xl font-bold">我的 Attitude 册子</h1>

      {/* 画像区 */}
      {data && (data.profile.attitudeSummary || data.profile.tags.length > 0) && (
        <section className="paper-card mt-5 animate-rise-in p-4">
          {data.profile.attitudeSummary && (
            <p className="font-serif text-[15px] leading-relaxed">{data.profile.attitudeSummary}</p>
          )}
          {data.profile.tags.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${data.profile.attitudeSummary ? 'mt-3' : ''}`}>
              {data.profile.tags.map((t, i) => {
                const meta = dimensionMeta(t.dimension);
                return (
                  <span
                    key={i}
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chipClass}`}
                  >
                    {t.label}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 条目按维度分组 */}
      {data && entries.length === 0 && (
        <EmptyState
          icon="冊"
          title="册子还是空的"
          desc="聊一段真实的经历，AI 会帮你把态度沉淀成一页页故事。"
          action={
            <Link to="/guide" className="btn-primary px-8">
              去表达一个态度
            </Link>
          }
        />
      )}

      <div className="mt-4 space-y-6">
        {grouped.map((g) => (
          <section key={g.meta.key}>
            <h2 className="mb-3 flex items-center gap-2 font-serif text-base font-semibold">
              <span>{g.meta.emoji}</span>
              {g.meta.name}
              <span className="text-xs font-normal text-ink-soft">{g.list.length} 篇</span>
            </h2>
            <div className="space-y-3">
              {g.list.map((entry) => (
                <StoryCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => navigate(`/booklet/${entry.id}`)}
                  onDelete={() => setDeleting(entry)}
                />
              ))}
            </div>
          </section>
        ))}
        {others.length > 0 && (
          <section>
            <h2 className="mb-3 font-serif text-base font-semibold">其他</h2>
            <div className="space-y-3">
              {others.map((entry) => (
                <StoryCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => navigate(`/booklet/${entry.id}`)}
                  onDelete={() => setDeleting(entry)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 删除确认弹层 */}
      {deleting && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 animate-fade-in"
          onClick={() => !busy && setDeleting(null)}
        >
          <div
            className="mx-auto w-full max-w-md animate-rise-in rounded-t-2xl bg-paper p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-semibold">删除这一页？</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              「{deleting.title}」将从册子中移除，无法恢复。
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setDeleting(null)} disabled={busy}>
                再想想
              </button>
              <button
                className="btn-primary flex-1 bg-coral-deep"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
