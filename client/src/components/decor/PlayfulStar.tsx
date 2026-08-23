interface PlayfulStarProps {
  size?: number;
  color?: string;
  rotation?: number;
  className?: string;
}

/** 手绘感四角星装饰，纯展示元素 */
export default function PlayfulStar({
  size = 14,
  color = '#E9C46A',
  rotation = 0,
  className = '',
}: PlayfulStarProps) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none select-none inline-block ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <path d="M12 1.5 C12.5 6.5, 14.5 9.5, 19.5 10.5 C14.5 11.5, 12.5 14.5, 12 22.5 C11.5 14.5, 9.5 11.5, 4.5 10.5 C9.5 9.5, 11.5 6.5, 12 1.5 Z" />
      </svg>
    </span>
  );
}
