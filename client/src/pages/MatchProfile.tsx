import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import type { BookletRes, Match, RecommendationsRes, User } from '../api/types';
import Avatar from '../components/Avatar';
import StoryCard from '../components/StoryCard';
import EmptyState from '../components/EmptyState';
import { dimensionMeta } from '../lib/dimensions';
import { toast } from '../store/session';

export default function MatchProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [booklet, setBooklet] = useState<BookletRes | null>(null);
  const [other, setOther] = useState<User | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let requests = 0;
    const tryDone = () => { requests += 1; if (requests >= 2) setLoading(false); };
    api
      .get<BookletRes>(`/booklet?userId=${encodeURIComponent(userId)}`)
      .then(setBooklet)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(tryDone);
    api
      .get<RecommendationsRes>('/match/recommendations')
      .then((res) => {
        const hit = res.recommendations.find((r) => r.user.id === userId);
        if (hit) setOther(hit.user);
      })
      .catch(() => {})
      .finally(tryDone);
  }, [userId]);

  const connect = async () => {
    if (!userId) return;
    setConnecting(true);
    try {
      const res = await api.post<{ match: Match }>('/match/connect', { targetUserId: userId });
      toast('已连接，开始聊聊吧');
      navigate(`/chat/${res.match.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '连接失败');
    } finally {
      setConnecting(false);
    }
  };

  const entries = booklet?.entries ?? [];

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-cream/95 px-3 py-3 backdrop-blur">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <span className="text-base font-semibold text-ink">TA 的册子</span>
      </header>

      <div className="px-5 pt-2">
        {/* 对方画像 */}
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
              <div className="h-full w-1/3 animate-[fade-in_1s_ease-in-out_infinite] bg-blue rounded-full" />
            </div>
            <p className="text-xs text-ink-4">加载中…</p>
          </div>
        ) : (
          <>
          <section className="card animate-rise-in p-4">
          <div className="flex items-center gap-3">
            {other && <Avatar emoji={other.avatarEmoji} color={other.avatarColor} size="lg" />}
            {!other && <Avatar emoji={null} color={null} size="lg" />}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-ink">{other?.nickname ?? '对方'}</h1>
              {other && (
                <p className="mt-0.5 text-sm text-ink-4">
                  {[other.age ? `${other.age} 岁` : '', other.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {other?.bio && <p className="mt-3 text-sm leading-relaxed text-ink-3">{other.bio}</p>}
          {booklet?.profile.attitudeSummary && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              {booklet.profile.attitudeSummary}
            </p>
          )}
          {booklet && booklet.profile.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {booklet.profile.tags.map((t, i) => {
                const meta = dimensionMeta(t.dimension);
                return (
                  <span
                    key={i}
                    className={`tag font-semibold ${meta.chipClass}`}
                  >
                    {t.label}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        {/* 册子条目只读预览 */}
        {booklet && entries.length === 0 && (
          <EmptyState icon="冊" title="TA 的册子还没有公开的故事" />
        )}
        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <StoryCard key={entry.id} entry={entry} readonly />
          ))}
        </div>
          </>
        )}
      </div>

      {/* 底部固定发起连接 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-light bg-cream/95 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-md space-y-2">
          <button className="btn-ghost w-full text-sm" onClick={() => navigate(`/prechat/${userId}`)}>
            💬 先看看 AI 怎么聊
          </button>
          <button className="btn-primary w-full" onClick={connect} disabled={connecting}>
            {connecting ? '连接中…' : '发起连接'}
          </button>
        </div>
      </div>
    </div>
  );
}
