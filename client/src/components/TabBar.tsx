import { NavLink } from 'react-router-dom';
import { BookOpen, Compass, House, Mail } from 'lucide-react';

const TABS = [
  { to: '/', label: '首页', icon: House },
  { to: '/discover', label: '发现', icon: Compass },
  { to: '/messages', label: '消息', icon: Mail },
  { to: '/booklet', label: '册子', icon: BookOpen },
];

export default function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                  isActive ? 'text-coral' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-0.5 w-6 rounded-full bg-coral transition-opacity duration-200 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icon size={20} strokeWidth={2.2} aria-hidden />
                  <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
