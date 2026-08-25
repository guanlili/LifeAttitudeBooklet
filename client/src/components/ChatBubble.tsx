import type { ReactNode } from 'react';
import type { MsgType } from '../api/types';

interface ChatBubbleProps {
  self: boolean;
  msgType?: MsgType;
  children: ReactNode;
}

export default function ChatBubble({ self, msgType = 'text', children }: ChatBubbleProps) {
  const badge =
    msgType === 'icebreaker' ? (
      <span className="mb-1 inline-flex w-fit items-center gap-1 tag bg-tag-blue text-ink-3 font-bold">
        💬 破冰话题
      </span>
    ) : msgType === 'reconnect' ? (
      <span className="mb-1 inline-flex w-fit items-center gap-1 tag bg-tag-pink text-ink-3 font-bold">
        🔥 重新连接
      </span>
    ) : null;

  return (
    <div className={`flex animate-rise-in ${self ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex max-w-[78%] flex-col px-3.5 py-2.5 text-[15px] leading-relaxed ${
          self
            ? 'bubble-self'
            : msgType === 'reconnect'
              ? 'rounded-2xl rounded-bl-md bg-tag-pink text-ink shadow-card'
              : 'bubble-other'
        }`}
      >
        {badge}
        <div className="whitespace-pre-wrap break-words">{children}</div>
      </div>
    </div>
  );
}
