import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Match, RecommendationsRes } from '../api/types';
import MatchCard from '../components/MatchCard';
import EmptyState from '../components/EmptyState';
import { toast } from '../store/session';

export default function Discover() {
  const navigate = useNavigate();
  const [data, setData] = useState<RecommendationsRes | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<RecommendationsRes>('/match/recommendations')
      .then(setData)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'));
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
    <div className="px-5 pb-6 pt-8">
      <h1 className="animate-rise-in font-serif text-2xl font-bold">发现同频的人</h1>
      <p className="mt-1 animate-rise-in text-sm text-ink-soft">先看态度，再看眼缘</p>

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

      <div className="mt-5 space-y-5">
        {data &&
          !data.needMoreEntries &&
          data.recommendations.map((rec) => (
            <MatchCard
              key={rec.user.id}
              rec={rec}
              connecting={connecting === rec.user.id}
              onViewBooklet={() => navigate(`/profile/${rec.user.id}`)}
              onConnect={() => connect(rec.user.id)}
            />
          ))}
      </div>
    </div>
  );
}
