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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[0.06] bg-tabbar-bg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md" style={{ height: '62px' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200 ${
                  isActive ? 'text-blue' : 'text-ink-5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
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
