import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import type { ChatRes, Icebreaker, Message, MsgType, SendMessageRes, User } from '../api/types';
import Avatar from '../components/Avatar';
import ChatBubble from '../components/ChatBubble';
import TopicCard from '../components/TopicCard';
import TypingDots from '../components/TypingDots';
import { toast, useSession } from '../store/session';

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [other, setOther] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [topics, setTopics] = useState<Icebreaker[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgType, setMsgType] = useState<MsgType>('text');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;
    api
      .get<ChatRes>(`/chat/${matchId}`)
      .then((res) => {
        setOther(res.otherUser);
        setMessages(res.messages);
      })
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
    api
      .get<{ topics: Icebreaker[] }>(`/chat/${matchId}/icebreakers`)
      .then((res) => setTopics(res.topics))
      .catch(() => {});
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = input.trim();
    if (!content || !matchId || sending) return;
    setSending(true);
    try {
      const payload: { content: string; msgType?: MsgType } = { content };
      if (msgType !== 'text') payload.msgType = msgType;
      const res = await api.post<SendMessageRes>(`/chat/${matchId}/messages`, payload);
      setMessages((prev) => {
        const next = [...prev, res.message];
        if (res.autoReply) next.push(res.autoReply);
        return next;
      });
      setInput('');
      setMsgType('text');
    } catch (e) {
      toast(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const pickTopic = async (topic: Icebreaker) => {
    setInput(topic.topic);
    setMsgType('icebreaker');
    setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, used: true } : t)));
    try {
      await api.post<{ ok: boolean }>(`/icebreakers/${topic.id}/use`, {});
    } catch {
      // use 标记失败不阻塞输入
    }
  };

  const refreshTopics = async () => {
    if (!matchId || refreshing) return;
    setRefreshing(true);
    try {
      const res = await api.post<{ topics: Icebreaker[] }>(`/chat/${matchId}/icebreakers/refresh`, {});
      setTopics(res.topics);
    } catch (e) {
      toast(e instanceof Error ? e.message : '换一批失败');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border-light bg-cream/95 px-3 py-2.5 backdrop-blur shadow-[0_2px_8px_rgba(40,70,140,0.06)]">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        {other && <Avatar emoji={other.avatarEmoji} color={other.avatarColor} size="sm" />}
        <h1 className="flex-1 truncate text-base font-semibold text-ink">
          {other?.nickname ?? ''}
        </h1>
      </header>

      {/* 消息流 */}
      <main className="flex-1 space-y-3 px-4 py-4 scroll-y">
        {loading && (
          <div className="flex justify-start">
            <div className="bubble-other px-3.5 py-3">
              <TypingDots />
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} self={m.senderId === user?.id} msgType={m.msgType}>
            {m.content}
          </ChatBubble>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* 底部：话题抽屉 + 输入框 */}
      <footer className="sticky bottom-0 border-t border-border-light bg-cream/95 backdrop-blur shadow-[0_-2px_8px_rgba(40,70,140,0.06)]">
        <div className="px-4 pt-2">
          <button
            className="flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-blue-deep"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            💬 聊点有态度的
            <span
              className={`text-xs transition-transform duration-200 ${drawerOpen ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </button>
          {drawerOpen && (
            <div className="animate-fade-in pb-1">
              <div className="flex snap-x gap-2 overflow-x-auto pb-2 scroll-x">
                {topics.map((t) => (
                  <TopicCard key={t.id} topic={t} onPick={() => pickTopic(t)} />
                ))}
                {topics.length === 0 && (
                  <p className="py-3 text-xs text-ink-4">暂无话题，点右侧换一批试试</p>
                )}
                <button
                  className="w-24 shrink-0 rounded-card-sm border border-dashed border-gray-blue text-sm text-ink-4 transition-colors hover:bg-gray-blue/30"
                  onClick={refreshTopics}
                  disabled={refreshing}
                >
                  {refreshing ? '生成中…' : '↻ 换一批'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-end gap-2 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1">
          <textarea
            className="input-field max-h-32 resize-none py-2.5 leading-relaxed"
            rows={1}
            placeholder={msgType === 'icebreaker' ? '破冰话题已填入，确认后发送' : '真诚一点，慢慢聊…'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (msgType === 'icebreaker' && e.target.value.trim() === '') setMsgType('text');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className="btn-primary shrink-0 px-4 text-sm"
            onClick={send}
            disabled={sending || !input.trim()}
          >
            发送
          </button>
        </div>
      </footer>
    </div>
  );
}
