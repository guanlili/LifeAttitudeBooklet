import { useLocation } from 'react-router-dom';
import PlayfulStar from './PlayfulStar';

type Variant = 'blue' | 'cream' | 'neutral';

const GRADIENTS: Record<Variant, string> = {
  neutral:
    'linear-gradient(180deg, rgba(92,138,240,0.08) 0%, rgba(214,223,238,0.06) 40%, rgba(255,251,237,0) 70%)',
  blue: 'linear-gradient(180deg, rgba(92,138,240,0.18) 0%, rgba(92,138,240,0.10) 25%, rgba(255,251,237,0) 55%)',
  cream: 'linear-gradient(180deg, rgba(255,251,237,0) 0%, rgba(255,227,116,0.06) 50%, rgba(255,251,237,0.12) 100%)',
};

function resolveVariant(pathname: string): Variant {
  if (pathname === '/' || pathname.startsWith('/discover')) return 'blue';
  if (pathname.startsWith('/login') || pathname.startsWith('/guide')) return 'cream';
  return 'neutral';
}

/** 全局氛围装饰层 - 蓝色系渐变 + 简约曲线 + 漂浮星星 */
export default function PageAtmosphere() {
  const { pathname } = useLocation();
  const variant = resolveVariant(pathname);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {(['neutral', 'blue', 'cream'] as const).map((v) => (
        <div
          key={v}
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            variant === v ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: GRADIENTS[v] }}
        />
      ))}
      {/* 简约蓝色曲线装饰 */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M 380 30 C 280 60, 120 120, 60 240 C 10 360, 180 460, 280 540 C 360 610, 300 730, 200 800"
          stroke="#5C8AF0"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.10"
        />
        <path
          d="M -10 160 C 100 190, 260 260, 280 380 C 300 500, 430 480, 420 560"
          stroke="#5C8AF0"
          strokeWidth="1"
          strokeLinecap="round"
          className={`transition-opacity duration-500 ${variant === 'blue' ? 'opacity-[0.14]' : 'opacity-0'}`}
        />
      </svg>
      {/* 漂浮星星 - 蓝色系 */}
      <div className="absolute left-5 top-16 animate-float">
        <PlayfulStar size={14} rotation={-14} />
      </div>
      <div className="absolute right-6 top-40 animate-float opacity-70" style={{ animationDelay: '1.2s' }}>
        <PlayfulStar size={10} rotation={22} color="#0F44A7" />
      </div>
      <div
        className={`absolute bottom-32 left-8 animate-float transition-opacity duration-500 ${
          variant === 'cream' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <PlayfulStar size={12} rotation={-18} color="#FFB974" />
      </div>
    </div>
  );
}
