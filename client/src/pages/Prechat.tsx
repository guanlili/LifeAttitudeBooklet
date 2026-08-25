import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import type { BookletRes, Entry, RecommendationsRes, User } from '../api/types';
import { dimensionMeta, DIMENSIONS } from '../lib/dimensions';
import { toast } from '../store/session';

interface PrechatScene {
  title: string;
  story: string;
  reply: string;
}

function buildScenes(otherEntries: Entry[], myEntries: Entry[], sharedDimensions: string[], seed = 0): PrechatScene[] {
  const dims = sharedDimensions.length > 0 ? sharedDimensions : DIMENSIONS.map((d) => d.key);
  const scenes: PrechatScene[] = [];

  const dimList = [...dims];
  if (seed > 0) {
    for (let i = dimList.length - 1; i > 0; i--) {
      const j = Math.floor((pseudoRand(seed + i) * (i + 1)));
      [dimList[i], dimList[j]] = [dimList[j], dimList[i]];
    }
  }

  for (let i = 0; i < dimList.length && scenes.length < 3; i++) {
    const dim = dimList[i];
    const otherEntry = otherEntries.find((e) => e.dimension === dim);
    const myEntry = myEntries.find((e) => e.dimension === dim);
    if (!otherEntry && !myEntry) continue;
    const meta = dimensionMeta(dim);

    scenes.push({
      title: `场景 ${scenes.length + 1}《${meta.name}》`,
      story: otherEntry
        ? `TA 的故事：${otherEntry.story?.slice(0, 80) || otherEntry.title}\nTA 的态度：${otherEntry.attitude}`
        : 'TA 在这个维度还没有留下 Attitude 记录。',
      reply: myEntry
        ? `我觉得：${myEntry.attitude}\n我的故事：${(myEntry.story || '').slice(0, 60)}${myEntry.story && myEntry.story.length > 60 ? '…' : ''}`
        : '我在这个维度还没有留下 Attitude 记录。',
    });
  }

  if (scenes.length === 0) {
    scenes.push({
      title: '场景 1《初次相遇》',
      story: '你们在 Attitude 小册子上相遇，彼此都有一些独特的生活态度等待被发现。',
      reply: '让我们从一个轻松的话题开始，慢慢了解彼此的三观和生活方式吧。',
    });
  }

  return scenes;
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export default function Prechat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [myBooklet, setMyBooklet] = useState<BookletRes | null>(null);
  const [otherBooklet, setOtherBooklet] = useState<BookletRes | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [sharedDimensions, setSharedDimensions] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      api.get<BookletRes>('/booklet'),
      api.get<BookletRes>(`/booklet?userId=${encodeURIComponent(userId)}`),
      api.get<RecommendationsRes>('/match/recommendations'),
    ])
      .then(([mine, other, recs]) => {
        setMyBooklet(mine);
        setOtherBooklet(other);
        const hit = recs.recommendations.find((r) => r.user.id === userId);
        if (hit) {
          setOtherUser(hit.user);
          setSharedDimensions(hit.sharedDimensions);
        } else if (other && other.entries.length > 0) {
          setSharedDimensions(Array.from(new Set(other.entries.map((e) => e.dimension))).slice(0, 3));
        }
      })
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [userId]);

  const scenes = useMemo(() => {
    const otherEntries = otherBooklet?.entries ?? [];
    const myEntries = myBooklet?.entries ?? [];
    return buildScenes(otherEntries, myEntries, sharedDimensions, version);
  }, [otherBooklet, myBooklet, sharedDimensions, version]);

  const goChat = async () => {
    if (!userId) return;
    try {
      const res = await api.post<{ match: { id: string } }>('/match/connect', { targetUserId: userId });
      navigate(`/chat/${res.match.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '发起连接失败');
    }
  };

  const refresh = () => setVersion((v) => v + 1);

  const formatTime = () => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-dvh bg-cream pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-cream/95 px-3 py-3 backdrop-blur">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <span className="text-base font-semibold text-ink">A2A 智能预聊</span>
      </header>

      <div className="sticky top-[56px] z-20 bg-cream px-3 pb-[6px] pt-[8px]">
        <div className="flex gap-[9px]">
          <PeerPanel
            color="blue"
            emoji={otherUser?.avatarEmoji}
            avatarColor={otherUser?.avatarColor}
            name={otherUser?.nickname ?? '对方'}
            gender={otherUser?.gender ?? null}
          />
          <PeerPanel
            color="orange"
            emoji={myBooklet?.profile.tags?.[0] ? '🙂' : '🙂'}
            avatarColor="#FFB974"
            name="我"
            gender={null}
          />
        </div>
      </div>

      <main className="px-3 pt-[14px]">
        <div className="rounded-card-sm bg-white p-[15px_14px_16px] shadow-card">
          <h3 className="text-[17px] font-extrabold text-blue-deep">预聊结果</h3>
          <p className="mt-[9px] pb-3 text-[11.5px] leading-[1.75] text-ink-2 border-b border-border-light mb-[14px]">
            在 <b className="text-blue font-bold">{formatTime()}</b>
            ，您的 Agent 与 TA 的 Agent 展开详聊，
            <b className="text-blue font-bold"> 预设场景 & TA 潜在 Attitude</b> 的详情如下：
          </p>

          {loading ? (
            <div className="py-8 text-center text-sm text-ink-4">正在生成预聊结果…</div>
          ) : (
            <div className="space-y-4">
              {scenes.map((sc, i) => (
                <div key={i}>
                  <h4 className="mb-[9px] text-[13px] font-bold text-ink">{sc.title}</h4>
                  <div className="mb-[10px] flex items-start gap-2">
                    <div className="flex-1 whitespace-pre-wrap rounded-[9px] bg-tag-pink px-[11px] py-[10px] text-[10.5px] leading-[1.75] text-[#3A4152]">
                      {sc.story}
                    </div>
                    <div
                      className="mt-0.5 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-white text-xs shadow-avatar"
                      style={{ backgroundColor: otherUser?.avatarColor || '#D6DFEE' }}
                    >
                      {otherUser?.avatarEmoji || '🙂'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div
                      className="mt-0.5 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-white text-xs shadow-avatar"
                      style={{ backgroundColor: '#FFB974' }}
                    >
                      🙂
                    </div>
                    <div className="flex-1 whitespace-pre-wrap rounded-[9px] bg-tag-green px-[11px] py-[9px] text-[10.5px] leading-[1.7] text-[#2F3A2C]">
                      {sc.reply}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-cream via-cream/80 to-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+11px)] pt-[9px]">
        <div className="mx-auto max-w-md flex gap-[9px]">
          <button className="btn-ghost flex-none w-[100px] text-sm" onClick={refresh}>
            换一个
          </button>
          <button className="btn-primary flex-1 text-sm" onClick={goChat}>
            开始真人聊
          </button>
        </div>
      </div>
    </div>
  );
}

function PeerPanel({
  color,
  emoji,
  avatarColor,
  name,
  gender,
}: {
  color: 'blue' | 'orange';
  emoji?: string | null;
  avatarColor?: string | null;
  name: string;
  gender: string | null;
}) {
  const bgClass = color === 'blue' ? 'bg-blue' : 'bg-orange';
  const genderIcon = gender === 'female' ? '♀' : gender === 'male' ? '♂' : '';
  const genderColor = gender === 'female' ? 'text-coral' : 'text-blue';

  return (
    <div
      className={`flex h-[112px] flex-1 flex-col items-center justify-center rounded-card-sm ${bgClass} relative`}
    >
      <div
        className="flex h-[62px] w-[62px] items-center justify-center rounded-[14px] border-2 border-white text-2xl shadow-avatar"
        style={{ backgroundColor: avatarColor || '#D6DFEE' }}
      >
        {emoji || '🙂'}
      </div>
      <div className="mt-2 flex items-center gap-[5px] text-[14px] font-bold text-white">
        <span>{name}</span>
        {genderIcon && (
          <span
            className={`inline-flex h-[15px] w-[15px] items-center justify-center rounded-[3px] bg-white/92 text-[10px] ${genderColor}`}
          >
            {genderIcon}
          </span>
        )}
      </div>
    </div>
  );
}
