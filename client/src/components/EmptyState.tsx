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
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-gray-blue bg-white text-3xl text-blue shadow-card-sm">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      {desc && <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-ink-3">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
