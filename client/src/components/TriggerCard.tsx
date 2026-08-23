import type { ReconnectTrigger, TriggerType } from '../api/types';
import Avatar from './Avatar';

const TRIGGER_LABEL: Record<TriggerType, { text: string; cls: string }> = {
  silence: { text: '沉默唤起', cls: 'bg-slate-200 text-slate-700' },
  new_entry: { text: '新故事', cls: 'bg-emerald-100 text-emerald-800' },
  resonance: { text: '共鸣', cls: 'bg-coral/15 text-coral-deep' },
};

interface TriggerCardProps {
  trigger: ReconnectTrigger;
  onSend: () => void;
  onDismiss: () => void;
  busy?: boolean;
}

export default function TriggerCard({ trigger, onSend, onDismiss, busy }: TriggerCardProps) {
  const label = TRIGGER_LABEL[trigger.triggerType] ?? TRIGGER_LABEL.silence;
  return (
    <article className="paper-card animate-rise-in p-4">
      <div className="flex items-center gap-3">
        <Avatar emoji={trigger.otherUser.avatarEmoji} color={trigger.otherUser.avatarColor} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-base font-semibold">
            {trigger.otherUser.nickname}
          </h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${label.cls}`}>
          {label.text}
        </span>
      </div>
      <p className="mt-3 rounded-xl bg-coral/5 px-3.5 py-3 text-sm leading-relaxed text-ink">
        {trigger.message}
      </p>
      <div className="mt-3 flex gap-2">
        <button className="btn-ghost flex-1 text-sm" onClick={onDismiss} disabled={busy}>
          暂不
        </button>
        <button className="btn-primary flex-1 text-sm" onClick={onSend} disabled={busy}>
          确认发送
        </button>
      </div>
    </article>
  );
}
