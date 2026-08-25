import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import SoyBean from '../components/SoyBean';
import { DIMENSIONS } from '../lib/dimensions';

const PARTICLE_COLORS = ['#FFE374', '#FF7A7A', '#5C8AF0', '#C9FFC0'];

interface BurstParticle {
  id: number;
  color: string;
  bx: number;
  by: number;
  duration: number;
}

export default function Shake() {
  const navigate = useNavigate();
  const [isShaking, setIsShaking] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const [hint, setHint] = useState('摇动手机，或点击黄豆');
  const beanWrapRef = useRef<HTMLDivElement>(null);
  const particleId = useRef(0);
  const lastShakeTime = useRef(0);

  const fire = useCallback(() => {
    if (cooling || isShaking) return;
    const now = Date.now();
    if (now - lastShakeTime.current < 3000) return;
    lastShakeTime.current = now;

    setIsShaking(true);
    setCooling(true);
    setHint('正在为你掉落 Attitude 场景…');

    setTimeout(() => {
      const burstOrigin = beanWrapRef.current?.getBoundingClientRect();
      if (burstOrigin) {
        const newParticles: BurstParticle[] = Array.from({ length: 16 }, (_, i) => {
          const ang = (Math.PI * 2 * i) / 16;
          const r = 110 + Math.random() * 80;
          return {
            id: ++particleId.current,
            color: PARTICLE_COLORS[i % 4],
            bx: Math.cos(ang) * r,
            by: Math.sin(ang) * r,
            duration: 0.55 + Math.random() * 0.3,
          };
        });
        setParticles(newParticles);
        setTimeout(() => setParticles([]), 1000);
      }
    }, 360);

    setTimeout(() => {
      const dim = DIMENSIONS[Math.floor(Math.random() * DIMENSIONS.length)];
      navigate(`/guide?dimension=${dim.key}`);
    }, 900);

    let left = 3;
    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        setCooling(false);
        setIsShaking(false);
        setHint('摇动手机，或点击黄豆');
      }
    }, 1000);
  }, [cooling, isShaking, navigate]);

  useEffect(() => {
    let lastT = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      const now = Date.now();
      if (mag > 32 && now - lastT > 1200) {
        lastT = now;
        fire();
      }
    };

    if (typeof DeviceMotionEvent !== 'undefined') {
      if (
        typeof (DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> })
          .requestPermission === 'function'
      ) {
        const handler = () => {
          (
            DeviceMotionEvent as typeof DeviceMotionEvent & {
              requestPermission?: () => Promise<string>;
            }
          )
            .requestPermission?.()
            .then((r) => {
              if (r === 'granted') window.addEventListener('devicemotion', onMotion);
            })
            .catch(() => {});
          window.removeEventListener('click', handler);
        };
        window.addEventListener('click', handler, { once: true });
      } else {
        window.addEventListener('devicemotion', onMotion);
      }
    }
    return () => {
      window.removeEventListener('devicemotion', onMotion);
    };
  }, [fire]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream">
      <header className="relative z-20 flex items-center gap-2 px-3 py-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-white/60"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
      </header>

      <div className="relative flex-1">
        <div
          ref={beanWrapRef}
          className="absolute left-1/2 top-[18%] -translate-x-1/2 cursor-pointer select-none"
          onClick={fire}
        >
          <SoyBean size="lg" state={isShaking ? 'shaking' : 'idle'} />
        </div>

        {particles.map((p) => (
          <span
            key={p.id}
            className="pointer-events-none absolute left-1/2 top-[25%] z-10 h-[9px] w-[9px] rounded-full animate-burst-out"
            style={
              {
                backgroundColor: p.color,
                ['--bx' as string]: `${p.bx}px`,
                ['--by' as string]: `${p.by}px`,
                animationDuration: `${p.duration}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="pb-8 text-center text-[11.5px] text-[#B79A5A]">{hint}</div>
    </div>
  );
}
