import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import type { BookletRes, Entry } from '../api/types';
import GalleryCard from '../components/GalleryCard';
import EmptyState from '../components/EmptyState';
import { DIMENSIONS } from '../lib/dimensions';
import { toast, useSession } from '../store/session';

export default function Booklet() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [data, setData] = useState<BookletRes | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<BookletRes>('/booklet')
      .then(setData)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
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
      if (openId === deleting.id) setOpenId(null);
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
  const knownKeys = new Set(DIMENSIONS.map((d) => d.key as string));
  const others = entries.filter((e) => !knownKeys.has(e.dimension));

  const truncate = (s: string, n = 100) => {
    if (s.length <= n) return s;
    return s.slice(0, n) + '…';
  };

  return (
    <div className="min-h-dvh bg-cream">
      {/* 顶部蓝色渐变标题区 */}
      <div
        className="h-[100px] w-full bg-blue relative sticky top-0 z-[15]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #6B94F2 0%, #5C8AF0 55%, #4A7CE0 100%)',
        }}
      >
        <div className="max-w-md mx-auto px-5 pt-8 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">我的 Attitude 展馆</h1>
          <Link
            to="/guide"
            className="w-[30px] h-[30px] rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
            aria-label="新增 Attitude"
          >
            <Plus size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <div className="px-3 pb-6 pt-2">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
              <div className="h-full w-1/3 animate-[fade-in_1s_ease-in-out_infinite] bg-blue rounded-full" />
            </div>
            <p className="text-xs text-ink-4">加载中…</p>
          </div>
        ) : (
          <>
        {/* 画像区 */}
        {data && (data.profile.attitudeSummary || data.profile.tags.length > 0) && (
          <section className="card mt-3 p-4 animate-rise-in">
            {data.profile.attitudeSummary && (
              <p className="text-[14px] leading-relaxed text-ink-2">
                {data.profile.attitudeSummary}
              </p>
            )}
            {data.profile.tags.length > 0 && (
              <div className={`flex flex-wrap gap-1.5 ${data.profile.attitudeSummary ? 'mt-3' : ''}`}>
                {data.profile.tags.slice(0, 8).map((t, i) => (
                  <span key={i} className={`tag ${['bg-tag-pink', 'bg-tag-green', 'bg-tag-blue'][i % 3]}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {data && entries.length === 0 && (
          <EmptyState
            icon="冊"
            title="展馆还是空的"
            desc="聊一段真实的经历，AI 会帮你把态度沉淀成一页页故事。"
            action={
              <Link to="/guide" className="btn-primary px-8">
                去表达一个态度
              </Link>
            }
          />
        )}

        {/* 展馆卡片列表 */}
        <div className="mt-3 space-y-5">
          {grouped.map((g) => (
            <section key={g.meta.key}>
              <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink-3 px-1">
                <span>{g.meta.emoji}</span>
                {g.meta.name}
                <span className="text-[11px] font-normal text-ink-4">{g.list.length} 篇</span>
              </h2>
              <div className="space-y-[11px]">
                {g.list.map((entry) => (
                  <div key={entry.id} className="relative">
                    <GalleryCard
                      title={entry.title}
                      detail={truncate(entry.story)}
                      tags={entry.tags}
                      avatarEmoji={user?.avatarEmoji ?? undefined}
                      avatarColor={user?.avatarColor ?? undefined}
                      open={openId === entry.id}
                      onToggle={(isOpen) => setOpenId(isOpen ? entry.id : null)}
                      tip={openId === entry.id ? '点击进入阅读 →' : undefined}
                      onTipClick={() => navigate(`/booklet/${entry.id}`)}
                    />
                    {/* 删除按钮 */}
                    {openId === entry.id && (
                      <button
                        className="absolute right-2 top-2 z-10 h-7 px-2.5 rounded-btn bg-white border border-border-soft text-[11px] text-coral font-bold shadow-card-sm active:scale-95 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(entry);
                        }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {others.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-[13px] font-semibold text-ink-3 px-1">其他</h2>
              <div className="space-y-[11px]">
                {others.map((entry) => (
                  <div key={entry.id} className="relative">
                    <GalleryCard
                      title={entry.title}
                      detail={truncate(entry.story)}
                      tags={entry.tags}
                      avatarEmoji={user?.avatarEmoji ?? undefined}
                      avatarColor={user?.avatarColor ?? undefined}
                      open={openId === entry.id}
                      onToggle={(isOpen) => setOpenId(isOpen ? entry.id : null)}
                      tip={openId === entry.id ? '点击进入阅读 →' : undefined}
                      onTipClick={() => navigate(`/booklet/${entry.id}`)}
                    />
                    {openId === entry.id && (
                      <button
                        className="absolute right-2 top-2 z-10 h-7 px-2.5 rounded-btn bg-white border border-border-soft text-[11px] text-coral font-bold shadow-card-sm active:scale-95 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(entry);
                        }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Attitude 入口按钮 */}
        <div className="mt-8">
          <Link
            to="/guide"
            className="btn-primary w-full text-sm"
          >
            + 新增 Attitude
          </Link>
        </div>
          </>
        )}
      </div>

      {/* 删除确认弹层 */}
      {deleting && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 animate-fade-in"
          onClick={() => !busy && setDeleting(null)}
        >
          <div
            className="mx-auto w-full max-w-md animate-rise-in rounded-t-[22px] bg-cream p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-top-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-ink">删除这一页？</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-3">
              「{deleting.title}」将从册子中移除，无法恢复。
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setDeleting(null)} disabled={busy}>
                再想想
              </button>
              <button
                className="btn-primary flex-1"
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
