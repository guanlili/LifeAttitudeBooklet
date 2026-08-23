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

  useEffect(() => {
    if (!userId) return;
    api
      .get<BookletRes>(`/booklet?userId=${encodeURIComponent(userId)}`)
      .then(setBooklet)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'));
    // 从推荐列表中取对方的基本资料（无独立用户详情端点）
    api
      .get<RecommendationsRes>('/match/recommendations')
      .then((res) => {
        const hit = res.recommendations.find((r) => r.user.id === userId);
        if (hit) setOther(hit.user);
      })
      .catch(() => {});
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
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-paper/95 px-3 py-3 backdrop-blur">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <span className="font-serif text-base font-semibold">TA 的册子</span>
      </header>

      <div className="px-5 pt-2">
        {/* 对方画像 */}
        <section className="paper-card animate-rise-in p-4">
          <div className="flex items-center gap-3">
            {other && <Avatar emoji={other.avatarEmoji} color={other.avatarColor} size="lg" />}
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif text-xl font-bold">{other?.nickname ?? '对方'}</h1>
              {other && (
                <p className="mt-0.5 text-sm text-ink-soft">
                  {[other.age ? `${other.age} 岁` : '', other.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {other?.bio && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{other.bio}</p>}
          {booklet?.profile.attitudeSummary && (
            <p className="mt-3 font-serif text-[15px] leading-relaxed">
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
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chipClass}`}
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
      </div>

      {/* 底部固定发起连接 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/95 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-md">
          <button className="btn-primary w-full" onClick={connect} disabled={connecting}>
            {connecting ? '连接中…' : '发起连接'}
          </button>
        </div>
      </div>
    </div>
  );
}
