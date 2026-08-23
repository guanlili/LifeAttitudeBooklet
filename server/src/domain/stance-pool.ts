/**
 * 立场词表单一来源（Single Source of Truth）。
 * - dimensions.ts 的 STANCES 由本表派生（map label）；
 * - mock.ts 的 STANCE_KEYWORDS 由本表派生（buildKeywordMap）。
 * 结构说明：每维度先列「既有立场」（label 与 keywords 逐字迁自原 dimensions.ts
 * STANCES / mock.ts STANCE_KEYWORDS，顺序不变，保证 mock 平票时既有立场优先），
 * 再追加来自交付包的新立场（注释标注来源轴 + delivery-pack (pending_review)）。
 */

import type { Dimension } from './dimensions.js';

export interface StanceItem {
  label: string;
  keywords: string[];
  /** 交付包来源轴 id（仅新增立场携带） */
  sourceAxis?: string;
}

export const STANCE_POOL: Record<Dimension, StanceItem[]> = {
  love: [
    // ---- 既有立场（逐字迁移） ----
    { label: '长期主义型', keywords: ['长期', '长久', '认真', '走下去', '未来', '一辈子'] },
    { label: '坦诚沟通型', keywords: ['坦诚', '说出来', '摊开', '直说', '真话'] },
    { label: '慢热观察型', keywords: ['慢热', '观察', '了解', '不着急', '时间验证'] },
    { label: '独立共生型', keywords: ['独立', '各自', '空间', '自己的生活'] },
    { label: '仪式感珍视型', keywords: ['仪式感', '纪念日', '惊喜', '记得'] },
    { label: '细水长流型', keywords: ['细水长流', '平淡', '日常', '陪伴', '安稳'] },
    { label: '双向奔赴型', keywords: ['双向', '奔赴', '互相', '一起努力'] },
    // ---- 新增立场：delivery-pack (pending_review) ----
    // 源轴 social_display「公开即诚意/对外可见=归属感」
    {
      label: '公开示爱型',
      keywords: ['公开', '官宣', '情侣头像', '发合照', '被认领'],
      sourceAxis: 'social_display',
    },
    // 源轴 social_display「关系私事论/分寸感优先」
    {
      label: '关系私事型',
      keywords: ['不用演', '两个人的事', '低调', '分寸', '不爱发朋友圈'],
      sourceAxis: 'social_display',
    },
    // 源轴 privacy_boundary「透明才信任」
    {
      label: '透明信任型',
      keywords: ['手机随便看', '不设防', '密码都知道', '坦荡', '主动敞开'],
      sourceAxis: 'privacy_boundary',
    },
    // 源轴 privacy_boundary「私域不可侵/查手机=越界」
    {
      label: '私域自主型',
      keywords: ['隐私', '不查手机', '各有空间', '不翻', '越界'],
      sourceAxis: 'privacy_boundary',
    },
    // 源轴 security_source「回应即安全/对方主动给足」
    {
      label: '回应即安全型',
      keywords: ['秒回', '及时回复', '被回应', '报备', '在乎的表现'],
      sourceAxis: 'security_source',
    },
    // 源轴 security_source「自我负责/信任不靠删人」
    {
      label: '安全感自给型',
      keywords: ['安全感自己给', '自己的课题', '不查岗', '先稳住自己', '信任'],
      sourceAxis: 'security_source',
    },
    // 源轴 past_ownership「切割才干净」
    {
      label: '过往清零型',
      keywords: ['前任', '删干净', '清空', '断干净', '新的开始'],
      sourceAxis: 'past_ownership',
    },
  ],
  conflict: [
    // ---- 既有立场（逐字迁移） ----
    { label: '冷静沟通型', keywords: ['冷静', '沟通', '好好说', '心平气和', '坐下来'] },
    { label: '直面解决型', keywords: ['直面', '当面', '直接', '当场', '马上解决'] },
    { label: '需要空间型', keywords: ['空间', '独处', '缓一缓', '先离开', '静一静'] },
    { label: '先退让后复盘型', keywords: ['退让', '复盘', '低头', '事后', '先让'] },
    { label: '幽默化解型', keywords: ['幽默', '玩笑', '逗', '台阶', '搞笑'] },
    { label: '求助外援型', keywords: ['朋友', '外援', '第三方', '咨询', '求助'] },
    // ---- 新增立场：delivery-pack (pending_review) ----
    // 源轴 conflict_style「当场清零」
    {
      label: '当天说清型',
      keywords: ['不过夜', '当天说清', '憋着难受', '说开', '隔夜仇'],
      sourceAxis: 'conflict_style',
    },
    // 源轴 conflict_style「冷却再谈」
    {
      label: '冷却再谈型',
      keywords: ['冷静了再说', '缓过来再谈', '先各自消化', '不逼当场', '改天再聊'],
      sourceAxis: 'conflict_style',
    },
    // 源轴 conflict_style「外传=背叛」
    {
      label: '不外传型',
      keywords: ['不外传', '不告诉别人', '两个人解决', '家丑', '关起门'],
      sourceAxis: 'conflict_style',
    },
    // 源轴 conflict_style「已读不回=冷处理」
    {
      label: '拒绝冷暴力型',
      keywords: ['冷暴力', '已读不回', '挂电话', '晾着', '冷处理'],
      sourceAxis: 'conflict_style',
    },
    // 源轴 conflict_style「静音权正当（见 privacy_boundary 静音条目的冲突语境）」
    {
      label: '静音缓冲型',
      keywords: ['静音', '先不回', '缓冲', '不消失', '暂停一下'],
      sourceAxis: 'conflict_style',
    },
  ],
  growth: [
    // ---- 既有立场（逐字迁移） ----
    { label: '大胆试错型', keywords: ['试错', '冒险', '裸辞', '闯', '大胆', '折腾'] },
    { label: '稳中求进型', keywords: ['稳', '踏实', '一步一步', '稳妥', '积累'] },
    { label: '长期规划型', keywords: ['规划', '计划', '目标', '五年', '路线'] },
    { label: '跟随热爱型', keywords: ['热爱', '喜欢', '兴趣', '心动', '想做的事'] },
    { label: '复盘迭代型', keywords: ['复盘', '总结', '迭代', '反思', '改进'] },
    { label: '顺势而为型', keywords: ['顺其自然', '顺势', '缘分', '走到哪', '随遇而安'] },
    // ---- 新增立场：delivery-pack (pending_review) ----
    // 源轴 career_tradeoff「事业不可让/机遇不可逆」
    {
      label: '事业优先型',
      keywords: ['事业', '晋升', '升职', '机遇', '窗口期', '不妥协'],
      sourceAxis: 'career_tradeoff',
    },
    // 源轴 career_tradeoff「陪读可弃业」
    {
      label: '为爱让步型',
      keywords: ['为对方', '辞职陪', '搬过去', '让步', '成全'],
      sourceAxis: 'career_tradeoff',
    },
    // 源轴 career_tradeoff「异地可接受」
    {
      label: '异地扛住型',
      keywords: ['异地', '高铁', '每周回', '扛过去', '攻坚期'],
      sourceAxis: 'career_tradeoff',
    },
    // 源轴 career_tradeoff「学业不可弃」
    {
      label: '学业为先型',
      keywords: ['读博', '深造', 'offer', '学业', '不放弃机会'],
      sourceAxis: 'career_tradeoff',
    },
  ],
  family: [
    // ---- 既有立场（逐字迁移） ----
    { label: '责任优先型', keywords: ['责任', '担当', '扛', '照顾', '养'] },
    { label: '边界清晰型', keywords: ['边界', '界限', '分开住', '距离', '各自空间'] },
    { label: '陪伴至上型', keywords: ['陪伴', '陪着', '在身边', '多回家'] },
    { label: '独立小家型', keywords: ['小家', '自己的家', '二人世界', '不同住'] },
    { label: '孝而不顺型', keywords: ['孝而不顺', '自己的选择', '不盲从', '理解但'] },
    { label: '共同承担型', keywords: ['共同', '一起承担', '商量', '分担', '两个人'] },
    // ---- 新增立场：delivery-pack (pending_review) ----
    // 源轴 family_boundary「原生家庭优先」
    {
      label: '原生托底型',
      keywords: ['托底', '赡养', '爸妈那边', '我得管', '养老'],
      sourceAxis: 'family_boundary',
    },
    // 源轴 family_authority「成年自己拍板」
    {
      label: '自己拍板型',
      keywords: ['自己拍板', '自己决定', '不被安排', '我的人生', '断奶'],
      sourceAxis: 'family_authority',
    },
    // 源轴 family_authority「父母意见当尊重」
    {
      label: '父母参谋型',
      keywords: ['听听父母', '过来人', '经验之谈', '参考爸妈', '尊重长辈'],
      sourceAxis: 'family_authority',
    },
    // 源轴 role_division「按擅长分工/弹性对等」
    {
      label: '分工弹性型',
      keywords: ['分工', '谁擅长谁做', '轮流', '搭把手', '不分你我'],
      sourceAxis: 'role_division',
    },
    // 源轴 commitment_pace「仪式不可省」
    {
      label: '仪式必要型',
      keywords: ['婚礼', '办酒', '仪式不能省', '正式一点', '给个交代'],
      sourceAxis: 'commitment_pace',
    },
    // 源轴 commitment_pace「落地优先」
    {
      label: '落地优先型',
      keywords: ['首付', '过日子实际', '不办婚礼', '钱花在刀刃', '先安家'],
      sourceAxis: 'commitment_pace',
    },
  ],
  values: [
    // ---- 既有立场（逐字迁移） ----
    { label: '量入为出型', keywords: ['量入为出', '预算', '记账', '理性消费', '规划着花'] },
    { label: '体验优先型', keywords: ['体验', '经历', '旅行', '值得', '当下'] },
    { label: '安全感储蓄型', keywords: ['储蓄', '存钱', '安全感', '积蓄', '攒'] },
    { label: '该花就花型', keywords: ['该花就花', '不亏待', '舍得', '对自己好'] },
    { label: '共同账本型', keywords: ['共同账本', '一起管', '合并', 'AA', '透明'] },
    { label: '极简生活型', keywords: ['极简', '断舍离', '少买', '简单生活'] },
    // ---- 新增立场：delivery-pack (pending_review) ----
    // 源轴 money_model「钱要算清」
    {
      label: 'AA分明型',
      keywords: ['AA', '对半', '算清楚', '各付各', '记账本'],
      sourceAxis: 'money_model',
    },
    // 源轴 money_model「算清=生分」
    {
      label: '不算细账型',
      keywords: ['不算细账', '不计较', '一家人', '算太清生分', '家不是公司'],
      sourceAxis: 'money_model',
    },
    // 源轴 money_model「公证=常识」
    {
      label: '婚前公证型',
      keywords: ['公证', '婚前财产', '白纸黑字', '防糊涂账', '先说清楚'],
      sourceAxis: 'money_model',
    },
    // 源轴 money_model「赡养是我的责任」
    {
      label: '赡养尽责型',
      keywords: ['给爸妈转钱', '孝敬钱', '份内事', '赡养费', '孝心'],
      sourceAxis: 'money_model',
    },
    // 源轴 money_model「小家账要共议」
    {
      label: '大额共议型',
      keywords: ['大额要商量', '一起决定', '共同支出', '大钱共议', '知会一声'],
      sourceAxis: 'money_model',
    },
  ],
};

/** 派生 mock 用的关键词映射：Record<Dimension, Record<stanceLabel, keywords>> */
export function buildKeywordMap(
  pool: Record<Dimension, StanceItem[]>,
): Record<Dimension, Record<string, string[]>> {
  const out = {} as Record<Dimension, Record<string, string[]>>;
  for (const [dim, items] of Object.entries(pool) as [Dimension, StanceItem[]][]) {
    out[dim] = {};
    for (const item of items) out[dim][item.label] = item.keywords;
  }
  return out;
}
