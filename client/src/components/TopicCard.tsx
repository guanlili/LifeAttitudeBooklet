import type { Icebreaker } from '../api/types';

interface TopicCardProps {
  topic: Icebreaker;
  onPick: () => void;
}

/** 破冰话题卡：点击后话题填入输入框，由用户手动发送 */
export default function TopicCard({ topic, onPick }: TopicCardProps) {
  return (
    <button
      className="card-interactive w-60 shrink-0 snap-start rounded-xl border border-teal/40 bg-teal/10 px-3.5 py-3 text-left hover:bg-teal/20"
      onClick={onPick}
      disabled={topic.used}
    >
      <div className={`text-sm font-medium leading-snug ${topic.used ? 'text-ink-soft/60 line-through' : 'text-ink'}`}>
        {topic.topic}
      </div>
      {topic.context && (
        <div className="mt-1.5 text-xs leading-relaxed text-ink-soft line-clamp-2">{topic.context}</div>
      )}
    </button>
  );
}
