interface AvatarProps {
  emoji: string | null;
  color: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: 'h-9 w-9 text-lg',
  md: 'h-12 w-12 text-2xl',
  lg: 'h-16 w-16 text-3xl',
};

export default function Avatar({ emoji, color, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white shadow-avatar ${SIZE[size]} ${className}`}
      style={{ backgroundColor: color || '#D6DFEE' }}
      aria-hidden
    >
      {emoji || '🙂'}
    </span>
  );
}
