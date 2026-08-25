import type { ReconnectTrigger, TriggerType } from '../api/types';
import Avatar from './Avatar';

const TRIGGER_LABEL: Record<TriggerType, { text: string; cls: string }> = {
  silence: { text: '沉默唤起', cls: 'bg-gray-blue text-ink-3' },
  new_entry: { text: '新故事', cls: 'bg-tag-green text-ink' },
  resonance: { text: '共鸣', cls: 'bg-tag-pink text-ink-3' },
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
    <article className="card animate-rise-in p-4">
      <div className="flex items-center gap-3">
        <Avatar emoji={trigger.otherUser.avatarEmoji} color={trigger.otherUser.avatarColor} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            {trigger.otherUser.nickname}
          </h3>
        </div>
        <span className={`tag font-semibold ${label.cls}`}>
          {label.text}
        </span>
      </div>
      <p className="mt-3 rounded-card-sm bg-tag-blue/50 px-3.5 py-3 text-sm leading-relaxed text-ink-2">
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
