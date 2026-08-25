import type { Icebreaker } from '../api/types';

interface TopicCardProps {
  topic: Icebreaker;
  onPick: () => void;
}

export default function TopicCard({ topic, onPick }: TopicCardProps) {
  return (
    <button
      className="card-interactive w-60 shrink-0 snap-start rounded-card-sm bg-white px-3.5 py-3 text-left shadow-card hover:bg-cream/30"
      onClick={onPick}
      disabled={topic.used}
    >
      <div className={`text-sm font-semibold leading-snug ${topic.used ? 'text-ink-4 line-through' : 'text-ink'}`}>
        {topic.topic}
      </div>
      {topic.context && (
        <div className="mt-1.5 text-xs leading-relaxed text-ink-3 line-clamp-2">{topic.context}</div>
      )}
    </button>
  );
}
