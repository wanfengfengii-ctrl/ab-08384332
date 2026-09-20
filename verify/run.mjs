#!/usr/bin/env node
/**
 * 可执行验收服务（docker compose 服务名：verify）。
 *
 * 验收内容：
 *  1. 解析与缩放：非负、最多三位小数、精确 ×1000 整数缩放、格式化回读；
 *  2. 求解器：无解 / 唯一 / 多个非镜像布局三类裁决，镜像归并，平移归零，
 *     重复间距多重性保留，零间距（位置重合）判无解；
 *  3. 消耗记录：逐距离消耗总数恰为 n(n-1)/2 且多重集精确一致；
 *  4. 随机模糊 + 独立暴力枚举交叉验证（n≤7 全量比对，n≤18 抽样一致性）；
 *  5. 可选：设置 WEB_URL 时对静态 Web 做 /healthz 与首页冒烟检查。
 *
 * 退出码：全部通过为 0，任一失败为 1。
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('./solver.bundle.cjs');

const {
  SCALE,
  scaleToken,
  formatScaled,
  parseDistanceText,
  parseMarkerCount,
  expectedDistanceCount,
  solveTurnpike,
  canonicalLayout,
  distancesFromPositions,
  buildConsumption,
  multisetEquals,
  lexCompare,
} = S;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` —— ${detail}` : ''}`);
  }
}

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------- 独立暴力枚举（与求解器实现无关的参照物） ----------
function bruteForceAll(n, distances) {
  const width = Math.max(...distances);
  const results = new Map();
  if (width === 0) return [];
  const interior = [];
  for (let x = 1; x < width; x++) interior.push(x);
  const combo = [];
  const rec = (start) => {
    if (combo.length === n - 2) {
      const layout = [0, ...combo, width];
      if (multisetEquals(distancesFromPositions(layout), distances)) {
        const canon = canonicalLayout(layout);
        results.set(canon.join(','), canon);
      }
      return;
    }
    for (let i = start; i < interior.length; i++) {
      combo.push(interior[i]);
      rec(i + 1);
      combo.pop();
    }
  };
  rec(0);
  return [...results.values()].sort(lexCompare);
}

function randomLayout(n, maxPos, rng) {
  const set = new Set();
  while (set.size < n) set.add(Math.floor(rng() * (maxPos + 1)));
  const layout = [...set].sort((a, b) => a - b);
  const min = layout[0];
  return layout.map((v) => v - min);
}

// 简单可复现随机数
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('== 1. 解析与缩放 ==');
check('缩放因子为 1000', SCALE === 1000);
check('整数缩放 12 -> 12000', scaleToken('12').value === 12000);
check('三位小数 1.234 -> 1234', scaleToken('1.234').value === 1234);
check('不足三位 0.7 -> 700', scaleToken('0.7').value === 700);
check('前导零 007 -> 7000', scaleToken('007').value === 7000);
check('四位小数被拒绝', !scaleToken('1.2345').ok);
check('负数被拒绝', !scaleToken('-1').ok);
check('非数字被拒绝', !scaleToken('abc').ok);
check('格式化 1234 -> "1.234"', formatScaled(1234) === '1.234');
check('格式化 12000 -> "12"', formatScaled(12000) === '12');
check('格式化 700 -> "0.7"', formatScaled(700) === '0.7');
check('格式化 0 -> "0"', formatScaled(0) === '0');
{
  const p = parseDistanceText('1, 2.5\n3.25，4、5;6；7|8  9');
  check('混合分隔符解析 9 个值', p.values.length === 9 && p.issues.length === 0);
  const bad = parseDistanceText('1 x 2.3456');
  check('非法 token 计入问题清单', bad.values.length === 1 && bad.issues.length === 2);
}
check('标记数下界 4 被拒绝', parseMarkerCount('3').n === null);
check('标记数上界 18 被拒绝', parseMarkerCount('19').n === null);
check('标记数 6 合法', parseMarkerCount('6').n === 6);
check('C(6,2)=15', expectedDistanceCount(6) === 15);
check('C(18,2)=153', expectedDistanceCount(18) === 153);

console.log('== 2. 求解器裁决 ==');
{
  // 经典唯一解 {0,1,4,6}，间距多重集 {1,2,3,4,5,6}
  const d = [1, 4, 6, 3, 5, 2].map((v) => v * SCALE);
  const r = solveTurnpike(4, d);
  check('唯一解裁决', r.verdict === 'unique', r.verdict);
  check('唯一解布局 [0,1,4,6]', eq(r.solutions[0], [0, 1, 4, 6].map((v) => v * SCALE)));
  check('最左点平移至零', r.solutions[0][0] === 0);
}
{
  // 同一多重集由镜像布局 {0,2,5,6} 生成，应归并为同一规范布局
  const d = distancesFromPositions([0, 2, 5, 6].map((v) => v * SCALE));
  const r = solveTurnpike(4, d);
  check('镜像视为同一布局（仍唯一）', r.verdict === 'unique');
  check('镜像归并为规范形式 [0,1,4,6]', eq(r.solutions[0], [0, 1, 4, 6].map((v) => v * SCALE)));
}
{
  // 经典同距对（homometric pair）：{0,1,4,10,12,17} 与 {0,1,8,11,13,17}
  const a = [0, 1, 4, 10, 12, 17].map((v) => v * SCALE);
  const b = [0, 1, 8, 11, 13, 17].map((v) => v * SCALE);
  const d = distancesFromPositions(a);
  check('同距对多重集一致', multisetEquals(d, distancesFromPositions(b)));
  const r = solveTurnpike(6, d);
  check('歧义裁决为 multiple', r.verdict === 'multiple', r.verdict);
  check('歧义布局数为 2', r.solutions.length === 2, String(r.solutions.length));
  check('规范最小布局在前', eq(r.solutions[0], a));
  check('第二份歧义见证', eq(r.solutions[1], b));
}
{
  const r = solveTurnpike(4, [1, 2, 3, 4, 5, 9].map((v) => v * SCALE));
  check('无解裁决', r.verdict === 'none', r.verdict);
  check('无解时无布局', r.solutions.length === 0);
}
{
  // 含 0 间距：必然要求两个标记重合，违反“位置互异”
  const r = solveTurnpike(4, [0, 1, 2, 3, 3, 6].map((v) => v * SCALE));
  check('零间距判无解', r.verdict === 'none', r.verdict);
  const r0 = solveTurnpike(4, [0, 0, 0, 0, 0, 0]);
  check('全零间距判无解', r0.verdict === 'none', r0.verdict);
}
{
  // 重复间距多重性：{0,1,2,4} 的间距为 {1,1,2,2,3,4}
  const layout = [0, 1, 2, 4].map((v) => v * SCALE);
  const d = distancesFromPositions(layout);
  const r = solveTurnpike(4, d);
  check('重复间距布局可重建', r.solutions.some((s) => eq(s, layout)), JSON.stringify(r.solutions));
  check('重复间距解均精确复现多重集', r.solutions.every((s) => multisetEquals(distancesFromPositions(s), d)));
}
{
  // 三位小数缩放后的求解
  const layout = [0, 750, 2500, 3125]; // 0, 0.75, 2.5, 3.125
  const d = distancesFromPositions(layout);
  const r = solveTurnpike(4, d);
  check('三位小数实例有解', r.solutions.length >= 1);
  check('三位小数解复现多重集', r.solutions.every((s) => multisetEquals(distancesFromPositions(s), d)));
}
{
  let threw = 0;
  try { solveTurnpike(4, [1, 2, 3]); } catch { threw++; }
  try { solveTurnpike(4, [1, 2, 3, 4, 5, -6]); } catch { threw++; }
  try { solveTurnpike(4, [1, 2, 3, 4, 5, 6.5]); } catch { threw++; }
  check('数量不符/负值/非整数均拒绝', threw === 3, `threw=${threw}`);
}
{
  const r = solveTurnpike(6, distancesFromPositions([0, 1, 4, 10, 12, 17].map((v) => v * SCALE)), { maxSolutions: 2 });
  check('maxSolutions=2 时恰返回 2 个布局', r.solutions.length === 2 && r.verdict === 'multiple');
}

console.log('== 3. 逐距离消耗记录 ==');
{
  const layout = [0, 1, 4, 6].map((v) => v * SCALE);
  const recs = buildConsumption(layout);
  check('消耗记录总数 = C(4,2)=6', recs.length === 6);
  check('消耗记录多重集与输入一致', multisetEquals(recs.map((r) => r.distance), distancesFromPositions(layout)));
  check('消耗记录按距离升序', recs.every((r, i) => i === 0 || recs[i - 1].distance <= r.distance));
  check('消耗记录端点自洽', recs.every((r) => r.to - r.from === r.distance && layout[r.i] === r.from && layout[r.j] === r.to));
}

console.log('== 4. 随机模糊 + 暴力交叉验证 ==');
{
  const rng = mulberry32(20260920);
  let fuzzFail = '';
  for (let t = 0; t < 40 && !fuzzFail; t++) {
    const n = 4 + Math.floor(rng() * 4); // 4..7
    const layout = randomLayout(n, 14, rng);
    const d = distancesFromPositions(layout);
    const expected = bruteForceAll(n, d);
    const r = solveTurnpike(n, d);
    if (r.stats.truncated) fuzzFail = `用例 ${t} 触发预算截断`;
    else if (!eq(r.solutions, expected)) fuzzFail = `用例 ${t} 解集与暴力枚举不一致`;
    const wantVerdict = expected.length === 0 ? 'none' : expected.length === 1 ? 'unique' : 'multiple';
    if (r.verdict !== wantVerdict) fuzzFail = `用例 ${t} 裁决 ${r.verdict} != ${wantVerdict}`;
  }
  check('40 组 n∈[4,7] 随机实例与暴力枚举完全一致', fuzzFail === '', fuzzFail);
}
{
  const rng = mulberry32(7);
  let fuzzFail = '';
  for (let t = 0; t < 12 && !fuzzFail; t++) {
    const n = 8 + Math.floor(rng() * 5); // 8..12
    const layout = randomLayout(n, 60, rng);
    const d = distancesFromPositions(layout);
    const r = solveTurnpike(n, d);
    if (r.solutions.length < 1) fuzzFail = `用例 ${t} 未找到任何布局`;
    else if (!r.solutions.every((s) => multisetEquals(distancesFromPositions(s), d))) fuzzFail = `用例 ${t} 解与多重集不一致`;
    else if (!r.solutions.some((s) => eq(s, canonicalLayout(layout)))) fuzzFail = `用例 ${t} 未包含原始布局`;
  }
  check('12 组 n∈[8,12] 随机实例解集自洽', fuzzFail === '', fuzzFail);
}
{
  const rng = mulberry32(99);
  let fuzzFail = '';
  for (let t = 0; t < 3 && !fuzzFail; t++) {
    const layout = randomLayout(18, 400, rng);
    const d = distancesFromPositions(layout);
    const r = solveTurnpike(18, d);
    if (r.solutions.length < 1) fuzzFail = `n=18 用例 ${t} 未找到任何布局`;
    else if (!r.solutions.every((s) => multisetEquals(distancesFromPositions(s), d))) fuzzFail = `n=18 用例 ${t} 解与多重集不一致`;
  }
  check('3 组 n=18 上限规模实例可解且自洽', fuzzFail === '', fuzzFail);
}
{
  const d = distancesFromPositions([0, 2, 7, 8, 11, 13].map((v) => v * SCALE));
  const r1 = solveTurnpike(6, d);
  const r2 = solveTurnpike(6, d);
  check('同一输入两次求解结果确定一致', eq(r1.solutions, r2.solutions) && r1.verdict === r2.verdict);
}

// ---------- 5. 可选 Web 冒烟 ----------
async function smokeWeb() {
  const base = process.env.WEB_URL;
  if (!base) {
    console.log('== 5. Web 冒烟 ==（未设置 WEB_URL，跳过）');
    return;
  }
  console.log('== 5. Web 冒烟 ==');
  const deadline = Date.now() + 60_000;
  const get = async (path) => {
    let lastErr;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(base + path);
        if (res.ok) return res;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw lastErr;
  };
  try {
    const hz = await get('/healthz');
    check('GET /healthz 返回 200', hz.status === 200);
    const home = await get('/');
    const html = await home.text();
    check('GET / 返回 200 且为 HTML', home.status === 200 && html.includes('<div id="root">'));
  } catch (e) {
    check('Web 冒烟检查', false, String(e && e.message ? e.message : e));
  }
}

await smokeWeb();

console.log('----------------------------------------');
console.log(`验收结果：${passed} 通过，${failed} 失败`);
if (failed > 0) {
  console.log(`失败用例：${failures.join('；')}`);
  process.exit(1);
}
console.log('全部验收用例通过。');
