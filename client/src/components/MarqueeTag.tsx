import { useEffect, useRef } from 'react';

export interface MarqueeTagProps {
  tags: string[];
  speed?: number;
  direction?: 'left' | 'right';
  colorMode?: 'rotate' | 'pink' | 'green' | 'blue';
  rowHeight?: number;
  className?: string;
}

const COLOR_CLASSES = ['bg-tag-pink', 'bg-tag-green', 'bg-tag-blue'];

export default function MarqueeTag({
  tags,
  speed = 26,
  direction = 'left',
  colorMode = 'rotate',
  rowHeight = 24,
  className = '',
}: MarqueeTagProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || tags.length === 0) return;

    const kids = [...track.children] as HTMLElement[];
    if (kids.length === 0) return;

    const singleCount = tags.length;
    const oneSetWidth = kids.slice(0, singleCount).reduce((s, el) => {
      const style = window.getComputedStyle(el);
      return s + el.offsetWidth + parseFloat(style.marginRight || '0');
    }, 0);

    if (oneSetWidth <= 0) return;

    let x = 0;
    let last = performance.now();
    const dir = direction === 'left' ? -1 : 1;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      x += dir * speed * dt;
      if (dir < 0 && x <= -oneSetWidth) x += oneSetWidth;
      if (dir > 0 && x >= 0) x -= oneSetWidth;
      track.style.transform = `translate3d(${x}px,0,0)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [tags, speed, direction]);

  const getColorClass = (i: number) => {
    if (colorMode === 'pink') return COLOR_CLASSES[0];
    if (colorMode === 'green') return COLOR_CLASSES[1];
    if (colorMode === 'blue') return COLOR_CLASSES[2];
    return COLOR_CLASSES[i % 3];
  };

  const tripled = [...tags, ...tags, ...tags];

  return (
    <div
      className={`marquee-tag-wrap ${className}`}
      style={{ height: rowHeight }}
    >
      <div ref={trackRef} className="marquee-tag-track" style={{ height: rowHeight }}>
        {tripled.map((tag, i) => (
          <span
            key={i}
            className={`tag ${getColorClass(i)}`}
            style={{ height: rowHeight, lineHeight: `${rowHeight}px` }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
