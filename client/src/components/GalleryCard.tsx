import { useState } from 'react';
import MarqueeTag from './MarqueeTag';
import Avatar from './Avatar';

export interface GalleryCardProps {
  title: string;
  detail: string;
  tags: string[];
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  tip?: string;
  onTipClick?: () => void;
}

export default function GalleryCard({
  title,
  detail,
  tags,
  avatarEmoji,
  avatarColor,
  open: controlledOpen,
  onToggle,
  tip,
  onTipClick,
}: GalleryCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) setInternalOpen(next);
    onToggle?.(next);
  };

  return (
    <div
      className={`gallery-card ${isOpen ? 'open' : ''} p-[13px] pb-[11px]`}
      onClick={handleToggle}
      role="button"
    >
      <div className="flex items-start gap-2">
        <b className="flex-1 text-[13.5px] font-bold leading-snug text-ink">{title}</b>
        <span className="text-ink-4 text-lg leading-none select-none" aria-hidden>⋯</span>
      </div>

      <div className="gallery-body">
        <div className="flex items-center gap-[7px]">
          {avatarEmoji !== undefined && (
            <Avatar emoji={avatarEmoji} color={avatarColor ?? null} size="sm" />
          )}
          <div className="flex-1 min-w-0">
            <MarqueeTag tags={tags} speed={20} colorMode="rotate" />
          </div>
        </div>
        <p className="mt-[9px] text-[11px] leading-[1.72] text-ink-3">{detail}</p>
      </div>

      {tip && (
        <div
          className="mt-[9px] text-right text-[9.5px] text-orange-deep"
          onClick={(e) => {
            if (onTipClick) {
              e.stopPropagation();
              onTipClick();
            }
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}
