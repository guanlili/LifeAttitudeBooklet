import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { HealthRes, MeRes } from '../api/types';
import { DIMENSIONS } from '../lib/dimensions';
import ModeBadge from '../components/ModeBadge';
import MarqueeTag from '../components/MarqueeTag';
import { toast, useSession } from '../store/session';

export default function Home() {
  const { user, logout } = useSession();
  const [me, setMe] = useState<MeRes | null>(null);
  const [aiMode, setAiMode] = useState<'real' | 'mock' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MeRes>('/me')
      .then((res) => { if (!cancelled) setMe(res); })
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败'))
      .finally(() => { if (!cancelled) setLoading(false); });
    api
      .get<HealthRes>('/health')
      .then((h) => setAiMode(h.aiMode))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const tagRows = useMemo(() => {
    const tags = me?.user.attitudeTags ?? [];
    const labels = tags.map((t) => t.label);
    if (labels.length === 0) return [['我的 Attitude 正在生长'], ['慢慢记录慢慢相遇'], ['欢迎来到我的小册子']];
    const rows: string[][] = [[], [], []];
    labels.forEach((l, i) => rows[i % 3].push(l));
    return rows.filter((r) => r.length > 0);
  }, [me]);

  const covered = new Set(me?.stats.dimensionsCovered ?? []);

  const genderIcon =
    user?.gender === 'female' ? '♀' : user?.gender === 'male' ? '♂' : '';

  return (
    <div className="min-h-dvh bg-cream relative">
      {aiMode === 'mock' && <ModeBadge />}

      {/* 顶部蓝色区域 */}
      <div
        className="h-[112px] w-full bg-blue relative"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #6B94F2 0%, #5C8AF0 50%, #4A7CE0 100%)',
        }}
      >
        {/* 红星入口 - 右上角 */}
        <Link
          to="/booklet"
          className="absolute right-3 top-5 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold active:scale-95 transition-transform"
          aria-label="进入 Attitude 展馆"
        >
          <span className="text-yellow">★</span>
          <span>展馆</span>
        </Link>

        <button
          className="absolute left-4 top-5 text-xs font-normal text-white/70 underline underline-offset-2"
          onClick={logout}
        >
          退出
        </button>
      </div>

      {/* 头像 - 跨在蓝色区和白色卡片交界处 */}
      <div className="relative z-10 -mt-[52px] flex justify-center">
        <div
          className="w-[104px] h-[104px] rounded-full border-[3px] border-white shadow-avatar flex items-center justify-center text-[48px]"
          style={{ backgroundColor: user?.avatarColor || '#D6DFEE' }}
        >
          {user?.avatarEmoji || '🙂'}
        </div>
      </div>

      {/* 白色内容区 */}
      <div
        className="bg-white rounded-t-[22px] shadow-top-sheet -mt-[52px] pt-[60px] px-4 pb-6 min-h-[calc(100dvh-112px)]"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-soft">
              <div className="h-full w-1/3 animate-[fade-in_1s_ease-in-out_infinite] bg-blue rounded-full" />
            </div>
            <p className="text-xs text-ink-4">加载中…</p>
          </div>
        ) : (
          <>
        {/* 昵称 + 性别 */}
        <div className="flex items-center justify-center gap-[7px] text-[17px] font-bold text-ink pb-[14px] border-b border-border-light">
          <span>{user?.nickname ?? ''}</span>
          {genderIcon && (
            <span className={`font-normal ${user?.gender === 'female' ? 'text-coral' : 'text-blue'}`}>
              {genderIcon}
            </span>
          )}
        </div>

        {/* 简介 / bio */}
        <div className="pt-[13px] text-[12px] text-ink-3 leading-[1.4] text-center">
          {me?.user.bio || me?.user.attitudeSummary || '记录生活里的每一个态度，慢慢拼成自己的样子。'}
        </div>

        {/* 统计数据 */}
        <div className="mt-4 flex justify-around py-3 rounded-[14px] bg-cream/60">
          <div className="text-center">
            <div className="text-[18px] font-bold text-blue-deep">{me?.stats.entryCount ?? 0}</div>
            <div className="text-[10.5px] text-ink-4 mt-0.5">态度条目</div>
          </div>
          <div className="w-px bg-border-soft" />
          <div className="text-center">
            <div className="text-[18px] font-bold text-blue-deep">
              {covered.size}/{DIMENSIONS.length}
            </div>
            <div className="text-[10.5px] text-ink-4 mt-0.5">维度覆盖</div>
          </div>
          <div className="w-px bg-border-soft" />
          <div className="text-center">
            <div className="text-[18px] font-bold text-blue-deep">{me?.stats.matchCount ?? 0}</div>
            <div className="text-[10.5px] text-ink-4 mt-0.5">匹配数</div>
          </div>
        </div>

        {/* 待处理触达提醒 */}
        {me && me.stats.pendingTriggers > 0 && (
          <Link
            to="/reconnect"
            className="mt-4 flex items-center gap-3 rounded-[14px] border border-blue/30 bg-blue/10 px-4 py-3 transition-colors active:bg-blue/15"
          >
            <span className="text-lg">🔔</span>
            <span className="flex-1 text-sm font-semibold text-blue-deep">
              有 {me.stats.pendingTriggers} 条重新连接的建议等你确认
            </span>
            <span className="text-blue-deep">›</span>
          </Link>
        )}

        {/* Attitude 标签跑马灯 */}
        <div className="mt-5">
          <div className="text-[12px] font-semibold text-ink-3 mb-2 px-1">
            // My Attitude //
          </div>
          <div className="flex flex-col gap-[7px]">
            {tagRows.map((row, i) => (
              <MarqueeTag
                key={i}
                tags={row}
                speed={19 + i * 4}
                rowHeight={26}
              />
            ))}
          </div>
        </div>

        {/* 进入 Attitude 展馆按钮 */}
        <Link
          to="/booklet"
          className="btn-primary w-full mt-6 text-sm"
        >
          进入 Attitude 展馆
        </Link>

        {/* SHAKE IT 入口 */}
        <Link
          to="/shake"
          className="mt-3 block overflow-hidden rounded-[14px] bg-gradient-to-r from-yellow/80 via-orange/60 to-coral/40 p-4 active:scale-[0.99] transition-transform shadow-card-sm"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl animate-bean-idle">🫘</div>
            <div className="flex-1">
              <p className="text-[15px] font-bold leading-tight text-[#8B6914]">
                SHAKE IT · 摇一摇
              </p>
              <p className="mt-1 text-[11px] text-[#8B6914]/80">
                摇动手机，随机掉落一个 Attitude 主题
              </p>
            </div>
            <span className="text-[#8B6914]">›</span>
          </div>
        </Link>

        {/* 今日引导入口 */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-ink mb-3">今日引导</h2>
          <Link
            to="/guide"
            className="card block overflow-hidden active:scale-[0.99] transition-transform"
          >
            <div className="h-1 w-full bg-blue" />
            <div className="p-4">
              <p className="text-[15px] font-semibold leading-snug text-blue-deep">
                聊一段真实的经历，
                <br />
                让态度替你说话。
              </p>
              <p className="mt-2 text-xs text-ink-3">AI 会像老朋友一样，陪你把故事慢慢讲清楚。</p>
            </div>
          </Link>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {DIMENSIONS.map((d, i) => {
              const isCovered = covered.has(d.key);
              return (
                <Link
                  key={d.key}
                  to={`/guide?dimension=${d.key}`}
                  className="card p-3 active:scale-[0.98] transition-transform"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{d.emoji}</span>
                    <span className="text-sm font-semibold leading-tight">{d.name}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3 line-clamp-2">{d.hint}</p>
                  {isCovered && (
                    <span className="mt-2 inline-block tag bg-tag-green font-semibold text-ink text-[10px]">
                      已收录
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
