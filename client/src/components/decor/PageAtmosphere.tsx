import { useLocation } from 'react-router-dom';
import PlayfulStar from './PlayfulStar';

type Variant = 'cool' | 'warm' | 'neutral';

const GRADIENTS: Record<Variant, string> = {
  neutral:
    'linear-gradient(180deg, rgba(126,163,237,0.16) 0%, rgba(212,227,246,0.10) 32%, rgba(250,246,240,0) 62%, rgba(255,249,233,0.35) 100%)',
  cool: 'linear-gradient(180deg, rgba(126,163,237,0.30) 0%, rgba(158,189,242,0.22) 22%, rgba(212,227,246,0.14) 45%, rgba(250,246,240,0) 68%, rgba(255,249,233,0.40) 100%)',
  warm: 'linear-gradient(180deg, rgba(226,237,252,0.28) 0%, rgba(239,245,253,0.16) 20%, rgba(250,248,242,0.06) 48%, rgba(255,249,233,0.45) 100%)',
};

function resolveVariant(pathname: string): Variant {
  if (pathname === '/' || pathname.startsWith('/discover')) return 'cool';
  if (pathname.startsWith('/login') || pathname.startsWith('/guide')) return 'warm';
  return 'neutral';
}

/** 全局氛围装饰层：低透明渐变 + 有机曲线 + 漂浮星星，随路由切换冷暖 variant */
export default function PageAtmosphere() {
  const { pathname } = useLocation();
  const variant = resolveVariant(pathname);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 三层常驻渐变，按 variant 交叉淡入淡出；低 alpha 让 body 纸纹理透出 */}
      {(['neutral', 'cool', 'warm'] as const).map((v) => (
        <div
          key={v}
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            variant === v ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: GRADIENTS[v] }}
        />
      ))}
      {/* 有机曲线 */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M 356 25 C 256 50, 100 112, 56 238 C 11 362, 178 450, 267 538 C 344 612, 289 725, 200 800"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M 410 175 C 300 200, 200 275, 244 362 C 289 450, 422 425, 410 525"
          stroke="#E8674A"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.14"
        />
        {/* variant 点缀曲线 */}
        <path
          d="M -20 120 C 90 140, 300 190, 344 300 C 388 420, 220 530, 130 600"
          stroke="#7EA3ED"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`transition-opacity duration-500 ${variant === 'cool' ? 'opacity-[0.18]' : 'opacity-0'}`}
        />
        <path
          d="M 44 100 C 144 33, 267 133, 356 67 C 400 40, 410 100, 378 156"
          stroke="#E8674A"
          strokeWidth="1.4"
          strokeLinecap="round"
          className={`transition-opacity duration-500 ${variant === 'warm' ? 'opacity-[0.16]' : 'opacity-0'}`}
        />
      </svg>
      {/* 漂浮星星 */}
      <div className="absolute left-5 top-16 animate-float">
        <PlayfulStar size={14} rotation={-14} />
      </div>
      <div className="absolute right-6 top-40 animate-float opacity-70" style={{ animationDelay: '1.2s' }}>
        <PlayfulStar size={10} rotation={22} />
      </div>
      <div
        className={`absolute bottom-32 left-8 animate-float transition-opacity duration-500 ${
          variant === 'warm' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <PlayfulStar size={12} rotation={-18} />
      </div>
    </div>
  );
}
