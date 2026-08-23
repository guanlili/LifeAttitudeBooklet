import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon = '✧', title, desc, action }: EmptyStateProps) {
  return (
    <div className="flex animate-fade-in flex-col items-center px-8 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-ink/20 bg-white/50 font-serif text-3xl text-coral/70">
        {icon}
      </div>
      <h3 className="mt-5 font-serif text-lg font-semibold">{title}</h3>
      {desc && <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-ink-soft">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
