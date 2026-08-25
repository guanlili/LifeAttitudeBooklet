import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { MatchListItem } from '../api/types';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { toast } from '../store/session';

/** 超过 3 天未聊视为「好久没聊了」 */
const SILENT_THRESHOLD_MINUTES = 60 * 24 * 3;

function summarize(item: MatchListItem): string {
  if (!item.lastMessage) return '还没开始聊，去打个招呼吧';
  const prefix =
    item.lastMessage.msgType === 'icebreaker'
      ? '[破冰] '
      : item.lastMessage.msgType === 'reconnect'
        ? '[重新连接] '
        : '';
  return prefix + item.lastMessage.content;
}

export default function Messages() {
  const [items, setItems] = useState<MatchListItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ matches: MatchListItem[] }>('/match/list')
      .then((res) => setItems(res.matches))
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="animate-rise-in text-2xl font-bold text-blue-deep">消息</h1>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
            <div className="h-full w-1/3 animate-[fade-in_1s_ease-in-out_infinite] bg-blue rounded-full" />
          </div>
          <p className="text-xs text-ink-4">加载中…</p>
        </div>
      ) : null}

      {items && items.length === 0 && (
        <EmptyState
          icon="✉"
          title="还没有连接"
          desc="去发现页看看和你态度同频的人吧。"
          action={
            <Link to="/discover" className="btn-primary px-8">
              去发现
            </Link>
          }
        />
      )}

      <ul className="mt-4 space-y-2">
        {!loading && items?.map((item, i) => (
          <li key={item.match.id} className="animate-rise-in" style={{ animationDelay: `${i * 0.04}s` }}>
            <Link
              to={`/chat/${item.match.id}`}
              className="card card-interactive flex items-center gap-3 p-3.5"
            >
              <Avatar emoji={item.otherUser.avatarEmoji} color={item.otherUser.avatarColor} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">
                    {item.otherUser.nickname}
                  </span>
                  <span className="tag bg-tag-blue font-semibold text-ink-3">
                    {Math.round(item.match.score * 100)}% 同频
                  </span>
                  {item.silentMinutes !== null && item.silentMinutes > SILENT_THRESHOLD_MINUTES && (
                    <span className="tag bg-gray-blue font-semibold text-ink-4">
                      好久没聊了
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-3">{summarize(item)}</p>
              </div>
              <span className="text-ink-4">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
