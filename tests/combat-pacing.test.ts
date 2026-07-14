import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCombatPacing,
  calculateRecommendedEhp,
  createBattleTelemetry,
  createEnemyCombatState,
  finishBattleTelemetry,
  getEnemyHpConfig,
  getIntentPreview,
  getIntentInterval,
  recordTelemetryShot,
  resolveEnemyShotDamage,
  restoreEnemyShieldOnce,
  validateCombatConfigs,
  type CombatTelemetrySnapshot,
} from "../app/combat-pacing.ts";

const hit = (levelId: string, damage: number, sourceType: "MATCH_CLEAR" | "BUBBLE_DROP" | "SPECIAL_BALL" = "MATCH_CLEAR") =>
  resolveEnemyShotDamage(createEnemyCombatState(levelId), { components: [{ sourceType, rawDamage: damage }] });

test("第一章十关 v1 血量与护盾符合任务书", () => {
  const expected = [[100, 0], [115, 0], [130, 0], [145, 15], [240, 50], [170, 0], [190, 10], [215, 15], [240, 20], [720, 60]];
  expected.forEach(([hp, shield], index) => {
    const config = getEnemyHpConfig(`CH1_${String(index + 1).padStart(2, "0")}`);
    assert.deepEqual([config.hp, config.shield], [hp, shield]);
  });
  assert.deepEqual(validateCombatConfigs(), []);
});

test("legacy 配置可回退且不污染 v1", () => {
  assert.equal(getEnemyHpConfig("CH1_01", "legacy").hp, 24);
  assert.equal(getEnemyHpConfig("CH1_01", "v1").hp, 100);
});

test("护盾优先吸收伤害", () => {
  const result = hit("CH1_07", 14);
  assert.equal(result.shieldDamage, 10);
  assert.equal(result.hpDamage, 4);
  assert.equal(result.state.hp, 186);
});

test("CH1-04 护盾存在时掉落伤害降低 20%", () => {
  const result = hit("CH1_04", 20, "BUBBLE_DROP");
  assert.equal(result.modifiedDamage, 16);
  assert.equal(result.shieldDamage, 15);
  assert.equal(result.hpDamage, 1);
  assert.equal(result.state.vulnerableShots, 1);
});

test("破盾后的下一发按总规则获得 50% 易伤", () => {
  const broken = hit("CH1_04", 20, "BUBBLE_DROP");
  const follow = resolveEnemyShotDamage(broken.state, { components: [{ sourceType: "MATCH_CLEAR", rawDamage: 10 }] });
  assert.equal(follow.modifiedDamage, 15);
  assert.equal(follow.state.vulnerableShots, 0);
});

test("CH1-08 镜像泡泡存在时特殊球伤害降低 20%", () => {
  const result = resolveEnemyShotDamage(createEnemyCombatState("CH1_08"), {
    components: [{ sourceType: "SPECIAL_BALL", rawDamage: 10 }],
    specialDamageMultiplier: .8,
  });
  assert.equal(result.modifiedDamage, 8);
  assert.equal(result.state.shield, 7);
});

test("精英护盾仅允许恢复一次", () => {
  const damaged = hit("CH1_05", 60);
  const first = restoreEnemyShieldOnce(damaged.state, 15);
  const duplicate = restoreEnemyShieldOnce(first.state, 15);
  assert.equal(first.restored, 15);
  assert.equal(duplicate.restored, 0);
  assert.equal(duplicate.duplicate, true);
});

test("精英完成首轮四项后跳过一次性护盾恢复并循环", () => {
  const state = createEnemyCombatState("CH1_05");
  assert.equal(getIntentPreview(state, 4, 0).action?.actionId, "ELITE_STONE_SPAWN_2");
  assert.equal(getIntentPreview(state, 5, 0).action?.actionId, "ELITE_STONE_ATTACK_8");
  assert.equal(getIntentPreview(state, 6, 0).action?.actionId, "ELITE_STONE_ATTACK_8_B");
});

test("Boss 第一阶段锁血且只继承 30% 过量伤害", () => {
  const result = hit("CH1_10", 300);
  assert.equal(result.phaseChanged, true);
  assert.equal(result.toPhase, 2);
  assert.equal(result.overkillDamage, 80);
  assert.equal(result.carryDamage, 24);
  assert.equal(result.state.phases[1].shield, 0);
  assert.equal(result.state.phases[1].hp, 236);
});

test("Boss 单发伤害不能跨过完整下一阶段", () => {
  const result = hit("CH1_10", 2000);
  assert.equal(result.toPhase, 2);
  assert.equal(result.state.phaseIndex, 1);
  assert.equal(result.state.phases[1].hp, 1);
  assert.equal(result.state.defeated, false);
});

test("Boss 第二阶段结束后第三阶段重新获得 40 护盾", () => {
  const phaseTwo = hit("CH1_10", 300).state;
  const phaseThree = resolveEnemyShotDamage(phaseTwo, { components: [{ sourceType: "MATCH_CLEAR", rawDamage: 236 }] });
  assert.equal(phaseThree.toPhase, 3);
  assert.equal(phaseThree.state.shield, 40);
  assert.equal(phaseThree.state.hp, 260);
});

test("Boss 第三阶段每 3 发行动，前两阶段每 4 发", () => {
  const phaseOne = createEnemyCombatState("CH1_10");
  const phaseTwo = hit("CH1_10", 300).state;
  const phaseThree = resolveEnemyShotDamage(phaseTwo, { components: [{ sourceType: "MATCH_CLEAR", rawDamage: 236 }] }).state;
  assert.equal(getIntentInterval(phaseOne), 4);
  assert.equal(getIntentInterval(phaseTwo), 4);
  assert.equal(getIntentInterval(phaseThree), 3);
});

test("战斗埋点记录伤害来源、发数和阶段迁移", () => {
  const initial = createEnemyCombatState("CH1_10");
  const telemetry = createBattleTelemetry({ state: initial, playerHp: 100, ballBagSize: 16, specialBallCount: 2, relicCount: 3, nowMs: 1000 });
  const damage = resolveEnemyShotDamage(initial, { components: [{ sourceType: "MATCH_CLEAR", rawDamage: 230 }] });
  recordTelemetryShot(telemetry, { missed: false, damage, nowMs: 5000 });
  const snapshot = finishBattleTelemetry(telemetry, { enemy: damage.state, playerHp: 92, playerDamageTaken: 8, result: "TEST", nowMs: 6000 });
  assert.equal(snapshot.shots_fired, 1);
  assert.equal(snapshot.clear_damage, damage.actualDamage);
  assert.equal(snapshot.boss_phase_transition_count, 1);
  assert.equal(snapshot.combat_duration_sec, 5);
});

test("离线校准建议受单轮 +25%/-20% 上下限约束", () => {
  assert.equal(calculateRecommendedEhp(100, 15, 5), 125);
  assert.equal(calculateRecommendedEhp(100, 15, 30), 80);
  const base: CombatTelemetrySnapshot = {
    level_id: "CH1_01", enemy_id: "ENEMY_SLIME", node_type: "NORMAL", hp_profile_version: "v1",
    combat_duration_sec: 55, shots_fired: 13, shots_missed: 2, median_shot_cycle_sec: 4,
    clear_damage: 70, drop_damage: 30, special_ball_damage: 0, relic_damage: 0, skill_damage: 0, status_damage: 0,
    total_damage: 100, effective_damage_per_shot: 7.7, highest_single_shot_damage: 16, overkill_damage: 0,
    initial_enemy_hp: 100, initial_enemy_shield: 0, remaining_enemy_hp: 0, remaining_enemy_shield: 0,
    boss_phase_reached: 1, boss_phase_transition_count: 0, enemy_intent_count: 3, enemy_attack_count: 1,
    pressure_trigger_count: 2, overflow_count: 0, player_hp_at_start: 100, player_hp_at_end: 95, player_damage_taken: 5,
    battle_result: "WIN", ball_bag_size: 16, special_ball_count: 0, relic_count: 3,
  };
  assert.equal(analyzeCombatPacing([base], getEnemyHpConfig("CH1_01")).passed, true);
});

test("配置异常会阻止负 HP、错误阶段总量与零意图间隔", () => {
  const invalidLevel = { ...getEnemyHpConfig("CH1_01"), hp: -1, intentIntervalShots: 0 };
  const boss = {
    levelId: "CH1_10", nodeType: "BOSS" as const, bossId: "BOSS_SPIDER_QUEEN", totalHp: 999, totalShield: 60,
    targetShotsMin: 43, targetShotsMax: 47, expectedEffectiveDamagePerShot: 17.5, targetDurationSec: { min: 180, max: 210 },
    phaseGateEnabled: true, overkillCarryRate: .3, transitionDurationMs: 2800,
    phases: [
      { phaseId: "P1", hp: 1, shield: 0, targetShotsMin: 1, targetShotsMax: 1, intentIntervalShots: 0, pressureMax: 5, intentCycle: [] },
    ],
  };
  const errors = validateCombatConfigs([invalidLevel], boss);
  assert.ok(errors.some((message) => message.includes("hp 必须大于 0")));
  assert.ok(errors.some((message) => message.includes("intentIntervalShots")));
  assert.ok(errors.some((message) => message.includes("阶段 HP 总和")));
});
