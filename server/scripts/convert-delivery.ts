/**
 * 交付包转换脚本（开发期工具，允许读取 Downloads 交付包；运行时代码严禁 import 本脚本产物）。
 * 用法：npx tsx scripts/convert-delivery.ts [交付包路径]
 * 输入：stories.json（84 篇）、态度标签池-83篇萃取.md（11 轴子标签）
 * 输出：server/data/delivery/{followup-candidates,stance-candidates,story-candidates}.json + README.md
 * 筛选标准：剔除 status==='rejected' 或 sensitivity>2 或 qc.overall<7.5 的篇目。
 * 末尾附带：各维度候选数断言打印 + 领域模块兼容断言 + mock 冒烟测试。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEEP_QUESTIONS, GUIDE_STORIES, STANCES, type Dimension } from '../src/domain/dimensions.js';
import { STANCE_POOL } from '../src/domain/stance-pool.js';
import { extractEntry } from '../src/ai/mock.js';
import type { GuideMsg } from '../src/db/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PACK_DIR = process.argv[2] ?? '/Users/guanhongli/Downloads/后端交付总包';
const OUT_DIR = path.resolve(__dirname, '../data/delivery');

/** 11 轴 → 5 维度映射（定稿写死） */
const AXIS_TO_DIM: Record<string, Dimension> = {
  social_display: 'love',
  privacy_boundary: 'love',
  security_source: 'love',
  past_ownership: 'love',
  conflict_style: 'conflict',
  career_tradeoff: 'growth',
  family_boundary: 'family',
  family_authority: 'family',
  role_division: 'family',
  commitment_pace: 'family',
  money_model: 'values',
};

const DIMS: Dimension[] = ['love', 'conflict', 'growth', 'family', 'values'];

// ---------- 1. 解析 stories.json 并筛选 ----------

interface RawStory {
  id: string;
  title: string;
  text: string;
  template: string;
  primary_axis: string;
  sensitivity: number;
  stance_options?: unknown;
  self_probe?: string;
  qc?: { overall?: number };
  status: string;
}

const storiesRaw = JSON.parse(fs.readFileSync(path.join(PACK_DIR, 'stories.json'), 'utf8')) as {
  stories: RawStory[];
};
const all = storiesRaw.stories;

const passed = all.filter(
  (s) => s.status !== 'rejected' && s.sensitivity <= 2 && (s.qc?.overall ?? 0) >= 7.5,
);
const rejectedCount = all.length - passed.length;

// ---------- 2. followup-candidates.json ----------

interface FollowupCandidate {
  storyId: string;
  dimension: Dimension;
  selfProbe: string;
  title: string;
}

let noSelfProbe = 0;
const followupCandidates: FollowupCandidate[] = [];
for (const s of passed) {
  const dim = AXIS_TO_DIM[s.primary_axis];
  if (!dim) continue;
  if (!s.self_probe) {
    noSelfProbe++;
    continue;
  }
  followupCandidates.push({ storyId: s.id, dimension: dim, selfProbe: s.self_probe, title: s.title });
}

// ---------- 3. stance-candidates.json（解析态度标签池 MD） ----------

interface StanceCandidate {
  axis: string;
  dimension: Dimension;
  tag: string;
  pole?: string;
  note?: string;
}

const md = fs.readFileSync(path.join(PACK_DIR, '态度标签池-83篇萃取.md'), 'utf8');
const stanceCandidates: StanceCandidate[] = [];
{
  let currentAxis: string | null = null;
  for (const line of md.split('\n')) {
    // 轴段落标题形如：## 大类一 · `social_display` 关系公开
    const axisMatch = line.match(/^## .*?`(\w+)`/);
    if (axisMatch) {
      currentAxis = axisMatch[1];
      continue;
    }
    // 「## 附：逐篇态度映射」及之后的段落无轴 id，currentAxis 置空跳过
    if (line.startsWith('## ')) {
      currentAxis = null;
      continue;
    }
    if (!currentAxis) continue;
    // 子标签条目形如：- **公开即诚意**：换情侣头像/发合照是基本诚意…
    const tagMatch = line.match(/^- \*\*(.+?)\*\*[：:](.*)$/);
    if (!tagMatch) continue;
    const dim = AXIS_TO_DIM[currentAxis];
    if (!dim) continue;
    const note = tagMatch[2].trim();
    // 极性说明：部分条目 note 内含「（反向：…）」提示反极性
    const poleMatch = note.match(/[（(]反[向转][：:](.+?)[）)]/);
    stanceCandidates.push({
      axis: currentAxis,
      dimension: dim,
      tag: tagMatch[1].trim(),
      ...(poleMatch ? { pole: poleMatch[1].trim() } : {}),
      ...(note ? { note } : {}),
    });
  }
}

// ---------- 4. story-candidates.json ----------

interface StoryCandidate {
  storyId: string;
  dimension: Dimension;
  template: string;
  sensitivity: number;
  qcOverall: number;
  title: string;
  text: string;
  selfProbe: string | null;
  stanceOptions: unknown;
}

const storyCandidates: StoryCandidate[] = passed
  .filter((s) => AXIS_TO_DIM[s.primary_axis])
  .map((s) => ({
    storyId: s.id,
    dimension: AXIS_TO_DIM[s.primary_axis],
    template: s.template,
    sensitivity: s.sensitivity,
    qcOverall: s.qc?.overall ?? 0,
    title: s.title,
    text: s.text,
    selfProbe: s.self_probe ?? null,
    stanceOptions: s.stance_options ?? null,
  }));

// ---------- 5. 写出产物（幂等覆盖） ----------

fs.mkdirSync(OUT_DIR, { recursive: true });
const writeJson = (name: string, data: unknown): void => {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n', 'utf8');
};
writeJson('followup-candidates.json', followupCandidates);
writeJson('stance-candidates.json', stanceCandidates);
writeJson('story-candidates.json', storyCandidates);

const countByDim = <T extends { dimension: Dimension }>(rows: T[]): Record<Dimension, number> => {
  const out = { love: 0, conflict: 0, growth: 0, family: 0, values: 0 } as Record<Dimension, number>;
  for (const r of rows) out[r.dimension]++;
  return out;
};
const followupByDim = countByDim(followupCandidates);
const stanceByDim = countByDim(stanceCandidates);
const storyByDim = countByDim(storyCandidates);

const readme = `# 交付包转换产物（delivery-pack, pending_review）

> 由 \`scripts/convert-delivery.ts\` 生成，输入为交付包 \`${PACK_DIR}\`。
> 本目录仅供开发期人工甄选参考，**运行时代码严禁 import 本目录任何文件**——
> 甄选后的最终数据已硬编码进 \`src/domain/stance-pool.ts\`、\`src/domain/story-bank.ts\`、\`src/domain/dimensions.ts\`。

## 筛选标准

剔除满足任一条件的篇目：\`status === 'rejected'\`、\`sensitivity > 2\`、\`qc.overall < 7.5\`。

- 交付包总篇数：${all.length}
- 通过筛选：${passed.length}（剔除 ${rejectedCount} 篇）
- 通过篇目中无 self_probe 字段（跳过计数）：${noSelfProbe}

## 产物说明

| 文件 | 用途 | 条数 |
| --- | --- | --- |
| followup-candidates.json | 通过篇目的 self_probe，供 followUps/DEEP_QUESTIONS 改写甄选 | ${followupCandidates.length} |
| stance-candidates.json | 态度标签池 11 轴子标签（含极性说明），供立场词表甄选 | ${stanceCandidates.length} |
| story-candidates.json | 通过篇目全文（含 stance_options），供 T2 故事改写 | ${storyCandidates.length} |

## 各维度分布（11 轴 → 5 维度映射后）

| 维度 | followup 候选 | stance 候选 | story 候选 |
| --- | --- | --- | --- |
${DIMS.map((d) => `| ${d} | ${followupByDim[d]} | ${stanceByDim[d]} | ${storyByDim[d]} |`).join('\n')}

## 已知事实

- growth 维度候选为 0：其唯一来源轴 career_tradeoff 的全部篇目 sensitivity=3，被筛选规则剔除。
  故 story-bank.ts 的 growth 组 followUps 保持原 4 条；growth 的 DEEP_QUESTIONS 扩充改写自
  stance-candidates 的 career_tradeoff 标签语义（源码注释已标注）。
`;
fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme, 'utf8');

// ---------- 6. 断言打印：各维度候选数统计 ----------

console.log('=== 转换产物统计 ===');
console.log(`总篇数 ${all.length} / 通过 ${passed.length} / 剔除 ${rejectedCount} / 无 self_probe ${noSelfProbe}`);
for (const d of DIMS) {
  console.log(`  ${d}: followup=${followupByDim[d]} stance=${stanceByDim[d]} story=${storyByDim[d]}`);
}

// ---------- 7. 兼容断言：领域模块只追加不删除 ----------

const assert = (cond: boolean, msg: string): void => {
  if (!cond) {
    console.error(`✗ 断言失败：${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${msg}`);
  }
};

/** 改造前 STANCES 快照（逐字），用于「旧值全部保留」断言 */
const OLD_STANCES: Record<Dimension, string[]> = {
  love: ['长期主义型', '坦诚沟通型', '慢热观察型', '独立共生型', '仪式感珍视型', '细水长流型', '双向奔赴型'],
  conflict: ['冷静沟通型', '直面解决型', '需要空间型', '先退让后复盘型', '幽默化解型', '求助外援型'],
  growth: ['大胆试错型', '稳中求进型', '长期规划型', '跟随热爱型', '复盘迭代型', '顺势而为型'],
  family: ['责任优先型', '边界清晰型', '陪伴至上型', '独立小家型', '孝而不顺型', '共同承担型'],
  values: ['量入为出型', '体验优先型', '安全感储蓄型', '该花就花型', '共同账本型', '极简生活型'],
};

console.log('=== 兼容断言 ===');
for (const d of DIMS) {
  const cur = STANCES[d];
  assert(
    OLD_STANCES[d].every((s) => cur.includes(s)),
    `${d}: 旧 STANCES ${OLD_STANCES[d].length} 个值全部保留`,
  );
  assert(cur.length >= 10 && cur.length <= 14, `${d}: 新词表长度 ${cur.length} ∈ [10,14]`);
  assert(cur.every((s) => s.endsWith('型')), `${d}: 全部 label 以「型」结尾`);
  assert(
    STANCE_POOL[d].every((s) => s.keywords.length >= 4),
    `${d}: 每个 stance 有 ≥4 个关键词`,
  );
  assert(DEEP_QUESTIONS[d].length === 4, `${d}: DEEP_QUESTIONS 为 4 条`);
}
// T2 扩充后的目标组数（love +6 / conflict +4 / growth +3 原创 / family +5 / values +4）
const GROUP_TARGET: Record<Dimension, number> = { love: 9, conflict: 7, growth: 6, family: 8, values: 7 };
for (const d of DIMS) {
  assert(
    GUIDE_STORIES[d].length === GROUP_TARGET[d],
    `${d}: 故事组数 ${GUIDE_STORIES[d].length} === ${GROUP_TARGET[d]}`,
  );
  assert(
    GUIDE_STORIES[d].every((g) => g.followUps.length >= 4 && g.followUps.length <= 6),
    `${d}: 每组 followUps 条数 ∈ [4,6]`,
  );
  assert(
    GUIDE_STORIES[d].every((g) => [...g.story].length >= 60 && [...g.story].length <= 120),
    `${d}: 每组 story 字数 ∈ [60,120]`,
  );
  assert(
    GUIDE_STORIES[d].every((g) => [...g.openQuestion].length <= 50),
    `${d}: 每组 openQuestion ≤ 50 字`,
  );
}

// ---------- 8. mock 冒烟：新关键词可命中新 stance ----------

console.log('=== mock 冒烟 ===');
const msgs: GuideMsg[] = [
  { role: 'user', content: '我觉得情侣之间就该AA，各付各的，大家算清楚反而关系长久。' } as GuideMsg,
];
const entry = extractEntry('values', msgs);
console.log(`extractEntry('values', 含AA/各付各/算清楚) → stance=${entry.stance}`);
assert(entry.stance === 'AA分明型', `values 冒烟命中新 stance「AA分明型」`);

const msgs2: GuideMsg[] = [
  { role: 'user', content: '吵架的事不外传，不告诉别人，两个人解决就好，家丑不外扬。' } as GuideMsg,
];
const entry2 = extractEntry('conflict', msgs2);
console.log(`extractEntry('conflict', 含不外传/两个人解决/家丑) → stance=${entry2.stance}`);
assert(entry2.stance === '不外传型', `conflict 冒烟命中新 stance「不外传型」`);

console.log(process.exitCode ? '存在断言失败' : '全部断言通过 ✅');
