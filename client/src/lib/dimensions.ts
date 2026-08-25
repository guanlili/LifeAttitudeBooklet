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
    chipClass: 'bg-tag-pink text-ink',
    barClass: 'bg-coral',
    hint: '你如何理解爱与被爱',
  },
  {
    key: 'conflict',
    name: '摩擦与冲突',
    emoji: '🌧️',
    chipClass: 'bg-tag-blue text-ink',
    barClass: 'bg-blue',
    hint: '分歧来临时你的样子',
  },
  {
    key: 'growth',
    name: '成长与选择',
    emoji: '🌱',
    chipClass: 'bg-tag-green text-ink',
    barClass: 'bg-tag-green',
    hint: '那些改变你的岔路口',
  },
  {
    key: 'family',
    name: '家庭与承诺',
    emoji: '🏡',
    chipClass: 'bg-tag-pink text-ink',
    barClass: 'bg-orange',
    hint: '家对你意味着什么',
  },
  {
    key: 'values',
    name: '金钱与生活价值观',
    emoji: '⚖️',
    chipClass: 'bg-tag-blue text-ink',
    barClass: 'bg-blue-deep',
    hint: '你想过怎样的生活',
  },
];

const map = new Map(DIMENSIONS.map((d) => [d.key, d]));

const FALLBACK: DimensionMeta = {
  key: 'values',
  name: '人生态度',
  emoji: '📖',
  chipClass: 'bg-gray-blue text-ink',
  barClass: 'bg-blue',
  hint: '',
};

export function dimensionMeta(key: string): DimensionMeta {
  return map.get(key as Dimension) ?? { ...FALLBACK, name: key };
}
