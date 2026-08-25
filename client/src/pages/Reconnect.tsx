import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import type { Message, ReconnectTrigger } from '../api/types';
import TriggerCard from '../components/TriggerCard';
import EmptyState from '../components/EmptyState';
import { toast } from '../store/session';

export default function Reconnect() {
  const navigate = useNavigate();
  const [triggers, setTriggers] = useState<ReconnectTrigger[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ triggers: ReconnectTrigger[] }>('/reconnect')
      .then((res) => setTriggers(res.triggers))
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const send = async (trigger: ReconnectTrigger) => {
    setBusyId(trigger.id);
    try {
      await api.post<{ ok: boolean; message: Message }>(`/reconnect/${trigger.id}/send`, {});
      toast('已发送，去继续聊聊吧');
      navigate(`/chat/${trigger.matchId}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '发送失败');
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (trigger: ReconnectTrigger) => {
    setBusyId(trigger.id);
    try {
      await api.post<{ ok: boolean }>(`/reconnect/${trigger.id}/dismiss`, {});
      setTriggers((prev) => (prev ? prev.filter((t) => t.id !== trigger.id) : prev));
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-dvh pb-8">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-cream/95 px-3 py-3 backdrop-blur">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <h1 className="text-base font-semibold text-ink">重新连接</h1>
      </header>

      <div className="px-5 pt-2">
        <p className="animate-rise-in text-sm text-ink-3">
          这些文案发送前都会经过你的确认，由你来主导每一次联系。
        </p>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-24">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
              <div className="h-full w-1/3 animate-[fade-in_1s_ease-in-out_infinite] bg-blue rounded-full" />
            </div>
            <p className="text-xs text-ink-4">加载中…</p>
          </div>
        )}

        {triggers && triggers.length === 0 && (
          <EmptyState icon="☕" title="暂无需要唤起的联系" desc="保持真诚的节奏，缘分不必着急。" />
        )}

        <div className="mt-4 space-y-4">
          {triggers?.map((t) => (
            <TriggerCard
              key={t.id}
              trigger={t}
              busy={busyId === t.id}
              onSend={() => send(t)}
              onDismiss={() => dismiss(t)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
