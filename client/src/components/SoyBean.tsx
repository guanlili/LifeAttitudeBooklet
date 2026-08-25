export interface SoyBeanProps {
  size?: 'sm' | 'md' | 'lg';
  state?: 'idle' | 'shaking' | 'listening';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-12 h-[52px]',
  md: 'w-20 h-[88px]',
  lg: 'w-32 h-[140px]',
};

const ANIM_MAP = {
  idle: 'animate-bean-idle',
  shaking: 'animate-bean-shake',
  listening: 'animate-bean-listening',
};

export default function SoyBean({ size = 'md', state = 'idle', className = '' }: SoyBeanProps) {
  return (
    <div className={`soy-bean ${SIZE_MAP[size]} ${ANIM_MAP[state]} ${className}`}>
      <span className="bean-eye left" />
      <span className="bean-eye right" />
      <span className="bean-blush left" />
      <span className="bean-blush right" />
      <span className="bean-mouth" />
    </div>
  );
}
