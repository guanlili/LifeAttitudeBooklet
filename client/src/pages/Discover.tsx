import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Match, Recommendation, RecommendationsRes } from '../api/types';
import MarqueeTag from '../components/MarqueeTag';
import EmptyState from '../components/EmptyState';
import { toast } from '../store/session';

function FeedCard({
  rec,
  onConnect,
  connecting,
  onView,
}: {
  rec: Recommendation;
  onConnect: () => void;
  connecting: boolean;
  onView: () => void;
}) {
  const { user, score, reasons, previewEntries } = rec;

  const tagLabels = user.attitudeTags.map((t) => t.label);
  const allTags = [
    ...tagLabels,
    ...reasons,
    ...previewEntries.flatMap((e) => e.tags),
  ];
  const uniqueTags = [...new Set(allTags)];

  const rowCount = 3;
  const rows: string[][] = [];
  for (let i = 0; i < rowCount; i++) {
    const row = [];
    for (let j = i; j < uniqueTags.length; j += rowCount) {
      row.push(uniqueTags[j]);
    }
    if (row.length < 4) {
      for (let k = 0; row.length < 4 && k < uniqueTags.length; k++) {
        if (!row.includes(uniqueTags[k])) row.push(uniqueTags[k]);
      }
    }
    rows.push(row);
  }

  const genderIcon = user.gender === 'female' ? '♀' : user.gender === 'male' ? '♂' : '';
  const jobLine = [user.city].filter(Boolean).join(' · ') || '一位同频的人';

  return (
    <article
      className="fc relative flex overflow-hidden rounded-[14px] bg-white shadow-card cursor-pointer animate-rise-in"
      style={{ marginBottom: '12px' }}
      onClick={onView}
      role="button"
    >
      <div className="fc-left w-[42%] flex-none flex flex-col items-center pr-[10px] pt-4 pb-[30px] pl-3">
        <div className="w-[86px] h-[86px] rounded-full border-2 border-white shadow-avatar flex items-center justify-center text-4xl"
          style={{ backgroundColor: user.avatarColor || '#D6DFEE' }}
        >
          {user.avatarEmoji || '🙂'}
        </div>
        <div className="mt-[10px] flex items-center gap-[5px]">
          <b className="text-[16px] font-bold text-ink">{user.nickname}</b>
          {genderIcon && (
            <span className={`text-[13px] ${user.gender === 'female' ? 'text-coral' : 'text-blue'}`}>
              {genderIcon}
            </span>
          )}
        </div>
        <div className="mt-[6px] text-[10.5px] text-ink-4 text-center leading-[1.4]">
          {jobLine}
        </div>
      </div>

      <div
        className="absolute top-4 bottom-[30px] w-px bg-black/10 z-[3]"
        style={{ left: 'calc(42% + 12px)' }}
      />

      <div className="flex-1 min-w-0 flex flex-col pt-4 pb-[30px] pr-3">
        <div className="text-center text-[11px] font-bold text-ink-3 tracking-[0.5px] mb-[9px]">
          // My Attitude //
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <MarqueeTag
              key={i}
              tags={row.length > 0 ? row : ['同频的人']}
              speed={20 + i * 6}
              direction="left"
            />
          ))}
        </div>
      </div>

      <div
        className="absolute right-3 bottom-[10px] text-right text-[9.5px] text-orange-deep"
        style={{ left: 'calc(42% + 14px)' }}
      >
        同频度 {Math.round(score * 100)}% · 点一下看看
      </div>

      <button
        className="absolute right-2 top-2 h-7 px-3 rounded-btn bg-blue text-white text-[11px] font-bold shadow-btn-primary active:scale-95 transition-transform z-10"
        onClick={(e) => {
          e.stopPropagation();
          onConnect();
        }}
        disabled={connecting}
      >
        {connecting ? '连接中…' : '打招呼'}
      </button>
    </article>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const [data, setData] = useState<RecommendationsRes | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<RecommendationsRes>('/match/recommendations')
      .then(setData)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const connect = async (targetUserId: string) => {
    setConnecting(targetUserId);
    try {
      const res = await api.post<{ match: Match }>('/match/connect', { targetUserId });
      toast('已连接，开始聊聊吧');
      navigate(`/chat/${res.match.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '连接失败');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="min-h-dvh">
      <div
        className="h-[112px] sticky top-0 z-[15] bg-blue"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgba(92,138,240,0.7) 0%, rgba(92,138,240,1) 100%)',
        }}
      >
        <div className="max-w-md mx-auto px-5 pt-8">
          <h1 className="text-2xl font-bold text-white">发现同频的人</h1>
          <p className="mt-1 text-sm text-white/80">先看态度，再看眼缘</p>
        </div>
      </div>

      <div className="px-3 pb-6 pt-2 -mt-1">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
              <div className="h-full w-1/3 animate-[fade-in_1s_ease-in-out_infinite] bg-blue rounded-full" />
            </div>
            <p className="text-xs text-ink-4">加载中…</p>
          </div>
        ) : (
          <>
        {data?.needMoreEntries && (
          <EmptyState
            icon="✍"
            title="先让态度替你说话"
            desc="册子里的故事多一点，才能为你找到真正聊得来的人。"
            action={
              <Link to="/guide" className="btn-primary px-8">
                先去表达一个态度
              </Link>
            }
          />
        )}

        {data && !data.needMoreEntries && data.recommendations.length === 0 && (
          <EmptyState
            icon="✧"
            title="暂时没有新的推荐"
            desc="多写几页态度，或过些时候再来看看。"
          />
        )}

        {data &&
          !data.needMoreEntries &&
          data.recommendations.map((rec, idx) => (
            <div key={rec.user.id} style={{ animationDelay: `${idx * 0.05}s` }}>
              <FeedCard
                rec={rec}
                onConnect={() => connect(rec.user.id)}
                connecting={connecting === rec.user.id}
                onView={() => navigate(`/profile/${rec.user.id}`)}
              />
            </div>
          ))}
          </>
        )}
      </div>
    </div>
  );
}
