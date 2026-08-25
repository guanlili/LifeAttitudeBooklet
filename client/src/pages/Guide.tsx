import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import type {
  Entry,
  GuideActiveRes,
  GuideMessageRes,
  GuideMsg,
  GuideSession,
  GuideStartRes,
} from '../api/types';
import ChatBubble from '../components/ChatBubble';
import TypingDots from '../components/TypingDots';
import StanceChip from '../components/StanceChip';
import { dimensionMeta, DIMENSIONS } from '../lib/dimensions';
import { toast } from '../store/session';

type ChatItem =
  | { kind: 'msg'; role: 'user' | 'assistant'; content: string }
  | { kind: 'entry'; entry: Entry };

export default function Guide() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<GuideSession | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const startSession = async (dimension?: string) => {
    const res = await api.post<GuideStartRes>('/guide/start', dimension ? { dimension } : {});
    setSession(res.session);
    setDone(false);
    setItems([{ kind: 'msg', role: 'assistant', content: res.message.content }]);
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const active = await api.get<GuideActiveRes>('/guide/active');
        if (active.session) {
          setSession(active.session);
          setItems(
            active.messages.map((m: GuideMsg) => ({
              kind: 'msg',
              role: m.role,
              content: m.content,
            })),
          );
        } else {
          await startSession(searchParams.get('dimension') ?? undefined);
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : '开启对话失败');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, waiting]);

  const send = async () => {
    const content = input.trim();
    if (!content || !session || waiting || done) return;
    setInput('');
    setItems((prev) => [...prev, { kind: 'msg', role: 'user', content }]);
    setWaiting(true);
    try {
      const res = await api.post<GuideMessageRes>(`/guide/${session.id}/message`, { content });
      setItems((prev) => {
        const next: ChatItem[] = [
          ...prev,
          { kind: 'msg', role: 'assistant', content: res.reply.content },
        ];
        if (res.done && res.entry) next.push({ kind: 'entry', entry: res.entry });
        return next;
      });
      if (res.done) setDone(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : '发送失败');
    } finally {
      setWaiting(false);
    }
  };

  const restartWith = async (dimension?: string) => {
    setLoading(true);
    try {
      await startSession(dimension);
    } catch (e) {
      toast(e instanceof Error ? e.message : '开启对话失败');
    } finally {
      setLoading(false);
    }
  };

  const meta = session ? dimensionMeta(session.dimension) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* 顶栏：返回 + 当前维度 */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border-light bg-cream/95 px-3 py-3 backdrop-blur">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-ink">
            {meta ? `${meta.emoji} ${meta.name}` : '态度引导'}
          </h1>
          <p className="text-xs text-ink-4">慢慢说，真实比精彩更重要</p>
        </div>
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
        {items.map((item, i) =>
          item.kind === 'msg' ? (
            <ChatBubble key={i} self={item.role === 'user'}>
              {item.content}
            </ChatBubble>
          ) : (
            <EntryCard key={i} entry={item.entry} onRechat={restartWith} />
          ),
        )}
        {waiting && (
          <div className="flex animate-fade-in justify-start">
            <div className="bubble-other px-3.5 py-3">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* 输入区 */}
      <footer className="sticky bottom-0 border-t border-border-light bg-cream/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        {done ? (
          <div className="flex gap-2">
            <Link to="/booklet" className="btn-primary flex-1 text-sm">
              收进我的册子
            </Link>
            <button className="btn-ghost flex-1 text-sm" onClick={() => restartWith(undefined)}>
              再聊一个维度
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              className="input-field max-h-32 resize-none py-2.5 leading-relaxed"
              rows={1}
              placeholder="说说你的故事…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading || waiting || !session}
            />
            <button
              className="btn-primary shrink-0 px-4 text-sm"
              onClick={send}
              disabled={loading || waiting || !input.trim() || !session}
            >
              发送
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

/** done 后内嵌到消息流的册子条目卡 */
function EntryCard({ entry, onRechat }: { entry: Entry; onRechat: (d?: string) => void }) {
  const meta = dimensionMeta(entry.dimension);
  const [picking, setPicking] = useState(false);
  return (
    <div className="card animate-rise-in overflow-hidden">
      <div className={`h-1 w-full ${meta.barClass}`} />
      <div className="p-4">
        <p className="text-xs text-ink-4">
          ✦ 已为你生成一页册子 · {meta.emoji} {meta.name}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug">{entry.title}</h3>
        <blockquote className="mt-2 border-l-2 border-blue/50 pl-3 text-[15px] font-semibold leading-relaxed text-ink">
          {entry.attitude}
        </blockquote>
        <div className="mt-3">
          <StanceChip stance={entry.stance} dimension={entry.dimension} />
        </div>
        <div className="mt-4 flex gap-2">
          <Link to="/booklet" className="btn-primary flex-1 text-sm">
            收进我的册子
          </Link>
          <button className="btn-ghost flex-1 text-sm" onClick={() => setPicking((v) => !v)}>
            再聊一个维度
          </button>
        </div>
        {picking && (
          <div className="mt-3 flex animate-fade-in flex-wrap gap-2">
            {DIMENSIONS.map((d) => (
              <button
                key={d.key}
                className={`tag font-semibold transition-transform active:scale-95 ${d.chipClass}`}
                onClick={() => onRechat(d.key)}
              >
                {d.emoji} {d.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
