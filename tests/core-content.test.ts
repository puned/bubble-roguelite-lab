import assert from "node:assert/strict";
import test from "node:test";
import {
  EffectQueue,
  enemyConfig,
  getBallDefinition,
  getBoardBubbleDefinition,
  getBoardModifierDefinition,
  getCharacterDefinition,
  getRelicDefinition,
  getStatusDefinition,
  validateCoreContent,
} from "../app/core-content.ts";
import {
  acquireRelic,
  addOrRefreshStatus,
  canBombClearBubble,
  createConfiguredInitialBallBag,
  createRelicRuntimeState,
  getDropDamageCap,
  getEnemyDamageMultiplier,
  getPierceStopCollision,
  getShotResolutionPriority,
  getSpecialEffectMultiplier,
  isNormalMatch,
  resolveDeathProtection,
  resolveIcePressure,
  resolveRelicTriggers,
  resolveShotEndPriority,
  selectRainbowColor,
  shouldTriggerFireEffects,
  tickStatuses,
  webPreventsDetach,
} from "../app/core-runtime.ts";

test("CORE-001: 五份 V1 配置的 ID 与 P0 引用全部通过校验", () => {
  assert.deepEqual(validateCoreContent(), []);
});

test("CORE-002: 火焰少年初始球包完全来自角色配置", () => {
  const bag = createConfiguredInitialBallBag();
  assert.equal(bag.length, 12);
  assert.equal(bag.filter((ball) => ball === "red").length, 4);
  assert.equal(bag.filter((ball) => ball === "fire").length, 1);
  assert.equal(getCharacterDefinition("CHAR_FIRE_BOY")?.activeSkill.energyCost, 6);
});

test("CORE-003: 普通球三连阈值为 3", () => {
  assert.equal(isNormalMatch(2), false);
  assert.equal(isNormalMatch(3), true);
});

test("CORE-004: 炸弹可清石头但不可直接清 Boss 核心", () => {
  assert.equal(canBombClearBubble("BUBBLE_STONE"), true);
  assert.equal(canBombClearBubble("BUBBLE_BOSS_CORE"), false);
});

test("CORE-005: 火焰球只有包含自身的有效三连才触发范围效果", () => {
  assert.equal(shouldTriggerFireEffects(2), false);
  assert.equal(shouldTriggerFireEffects(3), true);
  assert.equal(shouldTriggerFireEffects(4, false), false);
});

test("CORE-006: 冰冻球匹配后压力最低为 0，未匹配不减压", () => {
  assert.equal(resolveIcePressure(0, true), 0);
  assert.equal(resolveIcePressure(4, true), 3);
  assert.equal(resolveIcePressure(4, false), 4);
});

test("CORE-007: 彩虹球按匹配、掉落、权重、颜色枚举稳定决策", () => {
  const candidates = [
    { color: "red" as const, immediateMatchSize: 3, dropPotential: 2, activeColorWeight: 4 },
    { color: "blue" as const, immediateMatchSize: 3, dropPotential: 4, activeColorWeight: 1 },
    { color: "yellow" as const, immediateMatchSize: 2, dropPotential: 9, activeColorWeight: 9 },
  ];
  assert.equal(selectRainbowColor(candidates), "blue");
  assert.equal(selectRainbowColor(candidates), "blue");
});

test("CORE-008: 穿透球只忽略第一次碰撞", () => {
  assert.equal(getPierceStopCollision(["first", "second", "third"]), "second");
  assert.equal(getPierceStopCollision(["first"]), null);
});

test("CORE-009: 蛛网宿主失去顶部连接时不会掉落", () => {
  assert.equal(webPreventsDetach(), true);
  assert.equal(getBoardModifierDefinition("MOD_WEB")?.rules.removedWithHostOnDirectClear, true);
});

test("CORE-010: 压力触底不会误触发重力钩爪", () => {
  const result = resolveRelicTriggers(["RELIC_GRAVITY_HOOK"], {
    trigger: "ON_PLAYER_DROP_RESOLVED", battleId: "b1", shotId: "s1", dropCause: "PRESSURE_OVERFLOW", droppedBubbleCount: 20,
  }, createRelicRuntimeState());
  assert.equal(result.triggeredRelicIds.length, 0);
});

test("CORE-011: 精准回收每场最多返还一次", () => {
  const first = resolveRelicTriggers(["RELIC_PRECISION_RECYCLE"], {
    trigger: "ON_PLAYER_DROP_RESOLVED", battleId: "b1", shotId: "s1", dropCause: "PLAYER_ACTION", droppedBubbleCount: 10,
  }, createRelicRuntimeState());
  const second = resolveRelicTriggers(["RELIC_PRECISION_RECYCLE"], {
    trigger: "ON_PLAYER_DROP_RESOLVED", battleId: "b1", shotId: "s2", dropCause: "PLAYER_ACTION", droppedBubbleCount: 15,
  }, first.state);
  assert.deepEqual(first.triggeredRelicIds, ["RELIC_PRECISION_RECYCLE"]);
  assert.deepEqual(second.triggeredRelicIds, []);
});

test("CORE-012: 绝境弹匣仅在从 3 以上跨到 3 或以下时触发", () => {
  const first = resolveRelicTriggers(["RELIC_LAST_MAGAZINE"], {
    trigger: "ON_REMAINING_SHOTS_CHANGED", battleId: "b1", shotId: "s1", remainingShotsBefore: 4, remainingShotsAfter: 3,
  }, createRelicRuntimeState());
  const rebound = resolveRelicTriggers(["RELIC_LAST_MAGAZINE"], {
    trigger: "ON_REMAINING_SHOTS_CHANGED", battleId: "b2", shotId: "s2", remainingShotsBefore: 2, remainingShotsAfter: 3,
  }, createRelicRuntimeState());
  assert.equal(first.triggeredRelicIds.length, 1);
  assert.equal(rebound.triggeredRelicIds.length, 0);
});

test("CORE-013: 凤凰羽毛触发后从运行时遗物列表移除", () => {
  const result = resolveDeathProtection({ hp: 0, maxHp: 100, pressure: 4, relicIds: ["RELIC_PHOENIX_FEATHER"], state: createRelicRuntimeState() });
  assert.equal(result.hp, 30);
  assert.deepEqual(result.state.removedRelicIds, ["RELIC_PHOENIX_FEATHER"]);
});

test("CORE-014: 幸运铃铛优先于凤凰羽毛且一次只消费一个保护", () => {
  const result = resolveDeathProtection({
    hp: 0, maxHp: 100, pressure: 5,
    relicIds: ["RELIC_LUCKY_BELL", "RELIC_PHOENIX_FEATHER"], state: createRelicRuntimeState(),
  });
  assert.equal(result.hp, 1);
  assert.equal(result.pressure, 0);
  assert.equal(result.consumedRelicId, "RELIC_LUCKY_BELL");
  assert.deepEqual(result.state.removedRelicIds, []);
});

test("CORE-015: 易伤只刷新持续时间，不叠乘到 2.25", () => {
  let statuses = addOrRefreshStatus([], "STATUS_VULNERABLE_ENEMY", { value: 1.5, playerShots: 3 });
  statuses = addOrRefreshStatus(statuses, "STATUS_VULNERABLE_ENEMY", { value: 1.5, playerShots: 3 });
  assert.equal(getEnemyDamageMultiplier(statuses), 1.5);
  assert.equal(tickStatuses(statuses, "PLAYER_SHOT")[0].remainingPlayerShots, 2);
});

test("CORE-016: 镜像泡泡存在时特殊效果为 0.8，清除后恢复", () => {
  assert.equal(getSpecialEffectMultiplier(1), .8);
  assert.equal(getSpecialEffectMultiplier(0), 1);
});

test("CORE-017: 最后一发击破 Boss 阶段时先获得阶段奖励再判弹尽", () => {
  const result = resolveShotEndPriority({ enemyDefeated: false, bossPhaseChanged: true, phaseShotGrant: 3, remainingShots: 0, boardEmpty: false });
  assert.equal(result.outcome, "CONTINUE");
  assert.equal(result.remainingShots, 3);
  assert.equal(result.steps[0], "BOSS_PHASE_TRANSITION_AND_PHASE_SHOT_GRANT");
});

test("CORE-018: 最后一发未杀敌且无返还时不生成无法操作的新盘", () => {
  const result = resolveShotEndPriority({ enemyDefeated: false, bossPhaseChanged: false, phaseShotGrant: 0, remainingShots: 0, boardEmpty: true });
  assert.equal(result.outcome, "SHOT_LIMIT_EXHAUSTED");
  assert.equal(result.refillBoard, false);
});

test("CORE-019: Boss 三阶段数值、奖励与 30% 过量继承来自配置", () => {
  const boss = enemyConfig.chapter1Bosses[0];
  assert.equal(boss.phases.reduce((sum, phase) => sum + phase.hp, 0), 720);
  assert.equal(boss.phaseGate.overkillCarryRate, .3);
  assert.deepEqual(boss.phaseShotGrants.map((item) => item.grantShots), [3, 3]);
});

test("CORE-020: P0 配置对象、状态、遗物均可按 ID 查询", () => {
  assert.equal(getBallDefinition("BALL_PIERCE")?.implementationPriority, "P0");
  assert.equal(getBoardBubbleDefinition("BUBBLE_POISON")?.overflowWeight, 3);
  assert.equal(getStatusDefinition("STATUS_POISON_PLAYER")?.target, "PLAYER");
  assert.equal(getRelicDefinition("RELIC_SPIDER_SPOOL")?.rarity, "BOSS");
  assert.equal(getDropDamageCap("BOSS"), 40);
});

test("CORE-021: 遗物唯一规则与升级规则不会生成重复实例", () => {
  const unique = acquireRelic(["RELIC_PRISM"], "RELIC_PRISM");
  const upgrade = acquireRelic(["RELIC_GRAVITY_HOOK"], "RELIC_GRAVITY_HOOK");
  assert.equal(unique.acquired, false);
  assert.equal(upgrade.upgraded, true);
  assert.equal(unique.relicIds.length, 1);
});

test("CORE-022: EffectQueue 完整排空并阻止无界递归", () => {
  const queue = new EffectQueue();
  queue.enqueue({ sourceId: "A", effect: { effectType: "ADD_GOLD", value: 1 } });
  const result = queue.drain((item) => item.sourceId === "A" ? {
    followUps: [{ sourceId: "B", effect: { effectType: "HEAL_PLAYER", value: 1 } }],
    event: { source: item.sourceId },
  } : { event: { source: item.sourceId } });
  assert.equal(result.resolved, 2);
  assert.equal(queue.size, 0);
});

test("CORE-023: 固定结算优先级与总规则一致", () => {
  const priority = getShotResolutionPriority();
  assert.ok(priority.indexOf("BOSS_PHASE_TRANSITION_AND_PHASE_SHOT_GRANT") < priority.indexOf("SHOT_BUDGET_EXHAUSTION_CHECK"));
  assert.ok(priority.indexOf("SHOT_BUDGET_EXHAUSTION_CHECK") < priority.indexOf("BOARD_CLEAR_REFILL_IF_PLAYER_CAN_CONTINUE"));
  assert.ok(priority.indexOf("BOARD_CLEAR_REFILL_IF_PLAYER_CAN_CONTINUE") < priority.indexOf("DUE_ENEMY_INTENT"));
});
