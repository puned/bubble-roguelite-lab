import { readFileSync } from "node:fs";
import { analyzeCombatPacing, getEnemyHpConfig, type CombatTelemetrySnapshot } from "../app/combat-pacing.ts";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("用法：npm run report:pacing -- <combat-telemetry.json|jsonl>");
  process.exit(1);
}

const raw = readFileSync(inputPath, "utf8").trim();
const samples = (raw.startsWith("[")
  ? JSON.parse(raw)
  : raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))) as CombatTelemetrySnapshot[];

const byLevel = new Map<string, CombatTelemetrySnapshot[]>();
samples.forEach((sample) => {
  const group = byLevel.get(sample.level_id) ?? [];
  group.push(sample);
  byLevel.set(sample.level_id, group);
});

const report = [...byLevel].sort(([a], [b]) => a.localeCompare(b)).map(([levelId, levelSamples]) => {
  const analysis = analyzeCombatPacing(levelSamples, getEnemyHpConfig(levelId, "v1"));
  return {
    关卡: levelId,
    样本数: analysis.sampleCount,
    时长P25: analysis.duration.p25.toFixed(1),
    时长P50: analysis.duration.p50.toFixed(1),
    时长P75: analysis.duration.p75.toFixed(1),
    时长P90: analysis.duration.p90.toFixed(1),
    发数P25: analysis.shots.p25.toFixed(1),
    发数P50: analysis.shots.p50.toFixed(1),
    发数P75: analysis.shots.p75.toFixed(1),
    发数P90: analysis.shots.p90.toFixed(1),
    有效伤害P50: analysis.effectiveDamageP50.toFixed(2),
    玩家承伤P50: analysis.playerDamageP50.toFixed(1),
    建议EHP: analysis.recommendedEhp,
    达标: analysis.passed ? "是" : "否",
  };
});

console.table(report);
