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

  useEffect(() => {
    api
      .get<{ matches: MatchListItem[] }>('/match/list')
      .then((res) => setItems(res.matches))
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'));
  }, []);

  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="animate-rise-in font-serif text-2xl font-bold">消息</h1>

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
        {items?.map((item, i) => (
          <li key={item.match.id} className="animate-rise-in" style={{ animationDelay: `${i * 0.04}s` }}>
            <Link
              to={`/chat/${item.match.id}`}
              className="paper-card card-interactive flex items-center gap-3 p-3.5"
            >
              <Avatar emoji={item.otherUser.avatarEmoji} color={item.otherUser.avatarColor} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-serif text-[15px] font-semibold">
                    {item.otherUser.nickname}
                  </span>
                  <span className="rounded bg-coral/10 px-1.5 py-0.5 text-[10px] font-medium text-coral-deep">
                    {Math.round(item.match.score * 100)}% 同频
                  </span>
                  {item.silentMinutes !== null && item.silentMinutes > SILENT_THRESHOLD_MINUTES && (
                    <span className="rounded bg-paper-deep px-1.5 py-0.5 text-[10px] text-ink-soft">
                      好久没聊了
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-soft">{summarize(item)}</p>
              </div>
              <span className="text-ink-soft/50">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
