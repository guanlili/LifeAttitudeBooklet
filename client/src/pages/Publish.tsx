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
import SoyBean from '../components/SoyBean';
import TypingDots from '../components/TypingDots';
import { dimensionMeta } from '../lib/dimensions';
import { toast } from '../store/session';

type ChatItem =
  | { kind: 'msg'; role: 'user' | 'assistant'; content: string }
  | { kind: 'entry'; entry: Entry };

export default function Publish() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<GuideSession | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(true);
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
    setListening(false);
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

  const toggleListening = () => {
    setListening((v) => !v);
  };

  const meta = session ? dimensionMeta(session.dimension) : null;
  const entryItem = items.find((it): it is Extract<ChatItem, { kind: 'entry' }> => it.kind === 'entry');
  const tags = entryItem?.entry.tags ?? [];

  return (
    <div className="relative flex min-h-dvh flex-col bg-cream pb-32">
      <header className="sticky top-0 z-20 flex items-center gap-2 px-3 py-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[14.5px] font-bold text-ink">
            {meta ? `${meta.emoji} ${meta.name}` : '发表 Attitude'}
          </h1>
        </div>
        <div className="w-11" />
      </header>

      <main className="px-3">
        <div className="rounded-card-sm bg-white p-[18px] pb-5 shadow-card">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pb-3 scroll-y">
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-tag-pink px-3 py-2.5 text-sm text-ink shadow-card-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            {items.map((item, i) =>
              item.kind === 'msg' ? (
                <div
                  key={i}
                  className={`flex animate-rise-in ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      item.role === 'user'
                        ? 'rounded-br-md bg-blue text-white shadow-card'
                        : 'rounded-bl-md bg-tag-pink text-ink shadow-card'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{item.content}</div>
                  </div>
                </div>
              ) : null,
            )}
            {waiting && (
              <div className="flex animate-fade-in justify-start">
                <div className="rounded-2xl rounded-bl-md bg-tag-pink px-3 py-2.5 shadow-card-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {tags.length > 0 && (
            <div className="mt-3 border-t border-dashed border-border-soft pt-3">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span key={i} className={`tag font-semibold ${i % 3 === 0 ? 'bg-tag-pink' : i % 3 === 1 ? 'bg-tag-green' : 'bg-tag-blue'}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {done && entryItem && (
            <div className="mt-4 border-t border-border-light pt-4">
              <p className="text-xs font-semibold text-blue-deep">✦ 已生成 Attitude 条目</p>
              <h3 className="mt-1.5 text-base font-bold leading-snug text-ink">{entryItem.entry.title}</h3>
              <blockquote className="mt-2 border-l-2 border-blue/50 pl-3 text-sm font-semibold leading-relaxed text-ink">
                {entryItem.entry.attitude}
              </blockquote>
              <div className="mt-4 flex gap-2">
                <Link to="/booklet" className="btn-primary flex-1 text-sm">
                  查看我的展馆
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <div className="mx-auto max-w-md px-4">
          {listening && !done ? (
            <div className="mb-3 animate-rise-in">
              <div className="flex items-end gap-2">
                <textarea
                  className="input-field max-h-32 resize-none py-2.5 leading-relaxed"
                  rows={1}
                  placeholder="说说你的态度…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={loading || waiting || !session}
                  autoFocus
                />
                <button
                  className="btn-primary shrink-0 px-4 text-sm"
                  onClick={send}
                  disabled={loading || waiting || !input.trim() || !session}
                >
                  发送
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative mx-auto max-w-md">
          <div
            className="absolute left-3.5 bottom-0 z-20 cursor-pointer"
            onClick={toggleListening}
          >
            <SoyBean size="md" state={listening ? 'listening' : 'idle'} />
          </div>
          {!done && (
            <div className="absolute left-[92px] bottom-4 z-20 flex items-center gap-[5px] text-[10.5px] text-orange-deep">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-blue text-[9px] text-white">
                ◉
              </span>
              {listening ? '输入你的态度，按发送' : '点击黄豆，开始发表你的 Attitude！'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
