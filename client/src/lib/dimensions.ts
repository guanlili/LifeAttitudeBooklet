import type { Dimension } from '../api/types';

export interface DimensionMeta {
  key: Dimension;
  name: string;
  emoji: string;
  /** 立场 chip / 徽标着色 */
  chipClass: string;
  /** 卡片顶部细条着色 */
  barClass: string;
  /** 引导入口卡片的一句话描述 */
  hint: string;
}

export const DIMENSIONS: DimensionMeta[] = [
  {
    key: 'love',
    name: '亲密关系',
    emoji: '💞',
    chipClass: 'border-rose-200 bg-gradient-to-b from-rose-50 to-rose-100 text-rose-800 shadow-sm',
    barClass: 'bg-rose-300',
    hint: '你如何理解爱与被爱',
  },
  {
    key: 'conflict',
    name: '摩擦与冲突',
    emoji: '🌧️',
    chipClass: 'border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 text-slate-700 shadow-sm',
    barClass: 'bg-slate-400',
    hint: '分歧来临时你的样子',
  },
  {
    key: 'growth',
    name: '成长与选择',
    emoji: '🌱',
    chipClass: 'border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-800 shadow-sm',
    barClass: 'bg-emerald-300',
    hint: '那些改变你的岔路口',
  },
  {
    key: 'family',
    name: '家庭与承诺',
    emoji: '🏡',
    chipClass: 'border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-800 shadow-sm',
    barClass: 'bg-amber-300',
    hint: '家对你意味着什么',
  },
  {
    key: 'values',
    name: '金钱与生活价值观',
    emoji: '⚖️',
    chipClass: 'border-sky-200 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-800 shadow-sm',
    barClass: 'bg-sky-300',
    hint: '你想过怎样的生活',
  },
];

const map = new Map(DIMENSIONS.map((d) => [d.key, d]));

const FALLBACK: DimensionMeta = {
  key: 'values',
  name: '人生态度',
  emoji: '📖',
  chipClass: 'bg-paper-deep text-ink-soft border-ink/10 shadow-sm',
  barClass: 'bg-teal',
  hint: '',
};

export function dimensionMeta(key: string): DimensionMeta {
  return map.get(key as Dimension) ?? { ...FALLBACK, name: key };
}
