import type { ReactNode } from 'react';
import type { MsgType } from '../api/types';

interface ChatBubbleProps {
  self: boolean;
  msgType?: MsgType;
  children: ReactNode;
}

/** 聊天气泡：自己珊瑚橘、对方淡青；破冰/重连消息带徽标 */
export default function ChatBubble({ self, msgType = 'text', children }: ChatBubbleProps) {
  const badge =
    msgType === 'icebreaker' ? (
      <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[11px] font-medium text-teal-deep">
        💬 破冰话题
      </span>
    ) : msgType === 'reconnect' ? (
      <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-coral/15 px-2 py-0.5 text-[11px] font-medium text-coral-deep">
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
              ? 'rounded-2xl rounded-bl-md border border-coral/25 bg-coral/10 text-ink shadow-page'
              : 'bubble-other'
        }`}
      >
        {badge}
        <div className="whitespace-pre-wrap break-words">{children}</div>
      </div>
    </div>
  );
}
