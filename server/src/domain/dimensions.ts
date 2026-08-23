/**
 * 五大人生态度维度：立场词表、引导故事库、破冰/触达模板。
 * 静态常量，Mock 与真实 AI（prompt 词表约束）共用。
 */

import { STANCE_POOL } from './stance-pool.js';

export type Dimension = 'love' | 'conflict' | 'growth' | 'family' | 'values';

export interface DimensionInfo {
  key: Dimension;
  label: string;
  emoji: string;
}

export const DIMENSIONS: DimensionInfo[] = [
  { key: 'love', label: '亲密关系', emoji: '💞' },
  { key: 'conflict', label: '摩擦与冲突', emoji: '🌧️' },
  { key: 'growth', label: '成长与选择', emoji: '🌱' },
  { key: 'family', label: '家庭与承诺', emoji: '🏡' },
  { key: 'values', label: '金钱与生活价值观', emoji: '⚖️' },
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  love: '亲密关系',
  conflict: '摩擦与冲突',
  growth: '成长与选择',
  family: '家庭与承诺',
  values: '金钱与生活价值观',
};

export function isDimension(v: unknown): v is Dimension {
  return typeof v === 'string' && v in DIMENSION_LABELS;
}

/** 每维度的规范立场词表（extractEntry 的 stance 必须取自这里）；由 STANCE_POOL 派生 */
export const STANCES: Record<Dimension, string[]> = {
  love: STANCE_POOL.love.map((s) => s.label),
  conflict: STANCE_POOL.conflict.map((s) => s.label),
  growth: STANCE_POOL.growth.map((s) => s.label),
  family: STANCE_POOL.family.map((s) => s.label),
  values: STANCE_POOL.values.map((s) => s.label),
};

// ---------- 引导故事库：已迁移至 story-bank.ts（对外符号保持不变） ----------

export type { GuideStory } from './story-bank.js';
export { GUIDE_STORIES } from './story-bank.js';

/** 追问库用尽后的通用深挖问题（每维度） */
export const DEEP_QUESTIONS: Record<Dimension, string[]> = {
  love: [
    '多年以后你希望对方最记得你什么？',
    '你觉得自己在关系里最珍贵的特质是什么？',
    // story-011 self_probe 改写：delivery-pack (pending_review)
    '发现重要的人有不愿展示的角落，你会先看，还是先问为什么？',
    // story-124 self_probe 改写：delivery-pack (pending_review)
    '如果被要求随时共享位置，你的第一反应是同意、拒绝，还是先问为什么？',
  ],
  conflict: [
    '经历这些之后，你总结出了什么属于自己的原则？',
    '下一次冲突来临，你想尝试什么不同的做法？',
    // story-088 self_probe 改写：delivery-pack (pending_review)
    '挂断电话后等不等再拨，你觉得算不算关系里的试探？',
    // story-110 self_probe 改写：delivery-pack (pending_review)
    '吵架后想找人倾诉的冲动，对你来说是出口还是逃避？',
  ],
  growth: [
    '这段经历在你身上留下了什么痕迹？',
    '如果用一句话总结你的成长观，会是什么？',
    // 例外来源：career_tradeoff 篇目全部被 sensitivity 过滤，改写自态度标签池
    // 「事业不可让/机遇不可逆」标签语义：delivery-pack (pending_review)
    '如果机会窗口和身边重要的人只能先保一个，你会怎么排序？',
    // 「陪读可弃业」标签语义改写：delivery-pack (pending_review)
    '为重要的人放弃积累多年的东西，你觉得是成全还是丢掉一半自己？',
  ],
  family: [
    '你最想守护的家庭画面是什么样子？',
    '关于承诺，你最想对未来的家人说什么？',
    // story-117 self_probe 改写：delivery-pack (pending_review)
    '你上次特意提前赴约，是想向对方确认什么？',
    // story-138 self_probe 改写：delivery-pack (pending_review)
    '当回应只剩「嗯」和「哦」时，你会怎么确认自己被在乎？',
  ],
  values: [
    '如果只留三样花钱的地方，你留什么？',
    '你希望别人怎么形容你的生活方式？',
    // story-128 self_probe 改写：delivery-pack (pending_review)
    '一张婚前公证的空白页递到你面前，你会伸手接，还是往后缩？',
    // story-031 self_probe 语义延伸：delivery-pack (pending_review)
    '在钱这件事上，「先斩后奏」和「事事商量」，你更靠近哪一边？',
  ],
};

/** 引导中的共情前缀（避免每轮回复过于机械） */
export const ACK_PHRASES = [
  '谢谢你愿意说这些。',
  '嗯，我听到了。',
  '这段很真实。',
  '你描述得很具体，我能想象那个画面。',
  '这个想法很有你自己的印记。',
];

/** 完成一次引导的收尾语 */
export const CLOSING_MESSAGES = [
  '谢谢你的真诚分享，我把这段故事和你的态度整理进册子了，随时可以去翻看 📖',
  '这一段聊得很深，你的态度已经写进你的 Attitude 册子啦，它会替你遇见懂的人 📖',
  '今天就到这里，不累积疲惫。你的故事已经沉淀进册子，下次想聊别的维度随时来 📖',
];

// ---------- 破冰话题模板（{dim}=维度名 {stance}/{stanceA}/{stanceB}=立场去掉"型"） ----------

export const ICEBREAKER_TEMPLATES = {
  /** 双方立场相同 */
  shared: [
    '你们在「{dim}」上都偏向{stance}——聊聊各自是被什么经历塑造成这样的？',
    '两个人都选择了{stance}的{dim}态度，那你们觉得这种方式最大的代价是什么？',
    '同为{stance}的人：有没有哪一刻，你差点放弃这种坚持？',
  ],
  /** 同维度立场反差 */
  contrast: [
    '在「{dim}」上，一个偏{stanceA}、一个偏{stanceB}——猜猜对方为什么会那样想，再互相验证？',
    '{stanceA}遇上{stanceB}：如果你们要一起面对一次「{dim}」难题，会怎么分工？',
    '关于「{dim}」你们的答案不同，聊聊各自最不能让步的底线是什么？',
  ],
  /** 通用（基于某一方深耕的维度） */
  generic: [
    '你们都认真思考过「{dim}」——分享一个最近改变过你想法的瞬间？',
    '如果给五年后的自己写一句关于「{dim}」的提醒，你们各自会写什么？',
    '关于「{dim}」，你们各自见过的最好的一对榜样是谁？他们做对了什么？',
    '「{dim}」这件事上，你们最想被伴侣理解、却常被误解的一点是什么？',
  ],
};

// ---------- 长联触达模板（{name}=对方昵称 {dim}=维度名） ----------

export const RECONNECT_TEMPLATES: Record<'silence' | 'new_entry' | 'resonance', string[]> = {
  silence: [
    '好久没聊了。我又翻了翻你的册子，你在「{dim}」里写的那段一直记得。最近过得怎么样？',
    '突然想起我们上次聊到一半的话题。这几天我有了点新想法，想听听你的——最近还好吗？',
    '有阵子没说话了。想起你对「{dim}」的态度，突然很好奇：这段时间它有被验证过吗？',
  ],
  new_entry: [
    '看到你在册子里写了关于「{dim}」的新故事，读完很有共鸣，想和你聊聊这段。',
    '你更新了「{dim}」的态度，和我想的不太一样，反而更想听你展开说说了。',
  ],
  resonance: [
    '重读你的册子，发现我们在「{dim}」上想得很像。这种默契不常见，想接着上次的话题聊下去。',
    '最近遇到一件事，让我想起你在「{dim}」里写的态度。果然有些人想法会隔空对上。',
  ],
};

/** 种子用户自动回复模板（{tag}=其代表性立场短语） */
export const SEED_REPLY_TEMPLATES = [
  '谢谢你愿意跟我说这些。{tag}，所以你说的我特别能理解。这两天有点忙，晚点想认真回你一段长的。',
  '看到你的消息很开心。{tag}，你的想法让我想到了自己的一段经历，回头细聊？',
  '嗯嗯，我认真读完了。{tag}，我们在这点上还挺像的。等我忙完这阵，想跟你好好聊聊这个话题。',
];
