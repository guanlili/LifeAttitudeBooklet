import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { HealthRes, MeRes } from '../api/types';
import { DIMENSIONS } from '../lib/dimensions';
import ModeBadge from '../components/ModeBadge';
import PlayfulStar from '../components/decor/PlayfulStar';
import { toast, useSession } from '../store/session';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export default function Home() {
  const { user, logout } = useSession();
  const [me, setMe] = useState<MeRes | null>(null);
  const [aiMode, setAiMode] = useState<'real' | 'mock' | null>(null);

  useEffect(() => {
    api
      .get<MeRes>('/me')
      .then(setMe)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'));
    api
      .get<HealthRes>('/health')
      .then((h) => setAiMode(h.aiMode))
      .catch(() => {});
  }, []);

  const covered = new Set(me?.stats.dimensionsCovered ?? []);
  const progress = covered.size / DIMENSIONS.length;

  return (
    <div className="px-5 pb-6 pt-8">
      {aiMode === 'mock' && <ModeBadge />}

      <header className="relative animate-rise-in">
        <p className="text-sm text-ink-soft">{greeting()}，</p>
        <h1 className="mt-1 font-serif text-2xl font-bold">
          {user?.nickname ?? ''}
          <button
            className="ml-3 align-middle text-xs font-normal text-ink-soft/60 underline underline-offset-2"
            onClick={logout}
          >
            退出
          </button>
        </h1>
        <div className="absolute right-1 -top-1">
          <PlayfulStar size={12} rotation={18} />
        </div>
      </header>

      {/* 待处理触达提醒条 */}
      {me && me.stats.pendingTriggers > 0 && (
        <Link
          to="/reconnect"
          className="mt-5 flex animate-rise-in items-center gap-3 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 transition-colors hover:bg-coral/15"
        >
          <span className="text-lg">🔔</span>
          <span className="flex-1 text-sm font-medium text-coral-deep">
            有 {me.stats.pendingTriggers} 条重新连接的建议等你确认
          </span>
          <span className="text-coral-deep">›</span>
        </Link>
      )}

      {/* 册子进度 */}
      <section className="paper-card mt-5 animate-rise-in p-4" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-base font-semibold">我的册子</h2>
          <span className="text-xs text-ink-soft">
            已覆盖 {covered.size} / {DIMENSIONS.length} 个维度
            {me ? ` · ${me.stats.entryCount} 篇` : ''}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
          <div
            className="h-full rounded-full bg-coral transition-all duration-700"
            style={{ width: `${Math.max(progress * 100, 2)}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between">
          {DIMENSIONS.map((d) => (
            <div
              key={d.key}
              className={`flex flex-col items-center gap-1 text-center transition-opacity ${
                covered.has(d.key) ? '' : 'opacity-35'
              }`}
              title={d.name}
            >
              <span className="text-xl">{d.emoji}</span>
              <span className="text-[10px] text-ink-soft">{covered.has(d.key) ? '已收录' : '待书写'}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 今日引导入口 */}
      <section className="mt-6 animate-rise-in" style={{ animationDelay: '0.1s' }}>
        <h2 className="font-serif text-base font-semibold">今日引导</h2>
        <Link
          to="/guide"
          className="paper-card card-interactive mt-3 block overflow-hidden"
        >
          <div className="h-1 w-full bg-coral" />
          <div className="p-5">
            <p className="font-serif text-xl font-semibold leading-snug">
              聊一段真实的经历，
              <br />
              让态度替你说话。
            </p>
            <p className="mt-2 text-sm text-ink-soft">AI 会像老朋友一样，陪你把故事慢慢讲清楚。</p>
            <span className="btn-primary mt-4 w-full text-sm">开始今天的对话</span>
          </div>
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {DIMENSIONS.map((d, i) => (
            <Link
              key={d.key}
              to={`/guide?dimension=${d.key}`}
              className="paper-card card-interactive animate-rise-in p-3.5"
              style={{ animationDelay: `${0.12 + i * 0.04}s` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{d.emoji}</span>
                <span className="font-serif text-sm font-semibold leading-tight">{d.name}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{d.hint}</p>
              {covered.has(d.key) && (
                <span className="mt-2 inline-block rounded-full bg-teal/15 px-2 py-0.5 text-[10px] text-teal-deep">
                  已收录 · 可再聊
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
