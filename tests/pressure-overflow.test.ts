import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOverflowDamage,
  collectImpactedBubbles,
  completePressureOverflowResult,
  getPressureBubbleWeight,
  loadPressureOverflowConfig,
  playerBubbleDestroyContexts,
  pressureOverflowConfig,
  resolvePressureOverflowBoard,
  type PressureBubble,
} from "../app/pressure-overflow.ts";
import { createPlayerHealthState, performDeathPrevent, performManualRevive, resolvePlayerDamage } from "../app/survival.ts";
import { getInsertedRowBridgeCells, splitCeilingConnected } from "../app/board-connectivity.ts";

type TestBubble = PressureBubble & { col: number; boardSpecial?: "bomb" };
const bubble = (id: string, row: number, extra: Partial<TestBubble> = {}): TestBubble => ({ id, row, col: 0, color: "red", ...extra });
const keepAll = <T extends PressureBubble>(items: T[]) => ({ kept: items, dropped: [] as T[] });
const resolve = (boardAfterDrop: TestBubble[], options: Partial<Parameters<typeof resolvePressureOverflowBoard<TestBubble>>[0]> = {}) => resolvePressureOverflowBoard({
  battleId: "battle-1",
  resolveId: "overflow-1",
  boardAfterDrop,
  collapseRow: 9,
  overflowCountBeforeResolve: 0,
  damageCap: 99,
  findDetached: keepAll,
  ...options,
});

test("PO-001: no impacted bubble resets without damage, count, or detach scan", () => {
  let scans = 0;
  const board = [bubble("top", 0), bubble("bottom-safe", 9)];
  const resolution = resolve(board, { findDetached: (items) => { scans += 1; return keepAll(items); } });
  assert.equal(resolution.result.finalDamage, 0);
  assert.equal(resolution.result.overflowCountAfterResolve, 0);
  assert.equal(resolution.board.length, 2);
  assert.equal(scans, 0);
});

test("PO-002: three normal impacted bubbles produce one combined damage result", () => {
  const resolution = resolve([bubble("anchor", 0), bubble("a", 10), bubble("b", 10, { col: 1 }), bubble("c", 11)]);
  assert.equal(resolution.result.overflowWeight, 3);
  assert.equal(resolution.result.rawDamage, 12);
  assert.deepEqual(resolution.result.impactedBubbleIds, ["a", "b", "c"]);
  assert.deepEqual(resolution.board.map((item) => item.id), ["anchor"]);
  assert.equal(resolution.result.events.filter((event) => event === "PRESSURE_OVERFLOW_DAMAGE_APPLIED").length, 1);
});

test("PO-003: mixed impacted types use configured weights and one poison status", () => {
  const items = [
    bubble("n1", 10), bubble("n2", 10, { col: 1 }), bubble("stone", 10, { col: 2, color: "stone" }), bubble("poison", 10, { col: 3, poison: true }),
  ];
  const resolution = resolve(items);
  assert.equal(resolution.result.overflowWeight, 7);
  assert.equal(resolution.result.rawDamage, 20);
  assert.deepEqual(resolution.result.statusIds, ["STATUS_POISON_PLAYER"]);
  assert.equal(resolution.result.bubbleTypeCounts.POISON, 1);
});

test("PO-004: only the direct bottom bubble deals damage; twenty detached bubbles are rewardless", () => {
  const detached = Array.from({ length: 20 }, (_, index) => bubble(`floating-${index}`, 1 + Math.floor(index / 8), { col: index % 8 }));
  const resolution = resolve([bubble("impact", 10), bubble("anchor", 0), ...detached], {
    findDetached: (items) => ({ kept: items.filter((item) => item.id === "anchor"), dropped: items.filter((item) => item.id !== "anchor") }),
  });
  assert.equal(resolution.result.overflowWeight, 1);
  assert.equal(resolution.result.secondaryDetachedBubbleIds.length, 20);
  assert.equal(resolution.secondaryContext.source, "OVERFLOW_SECONDARY_DETACH");
  assert.equal(resolution.secondaryContext.grantRewards, false);
  assert.equal(resolution.secondaryContext.damageEnemy, false);
  assert.equal(resolution.secondaryContext.damagePlayer, false);
});

test("PO-005: impacted bomb is removed without special effects or neighbor clear", () => {
  const neighbor = bubble("neighbor", 0);
  const resolution = resolve([neighbor, bubble("bomb", 10, { boardSpecial: "bomb" })]);
  assert.deepEqual(resolution.board.map((item) => item.id), ["neighbor"]);
  assert.equal(resolution.directContext.triggerSpecialEffects, false);
});

test("PO-006: coin and chest are lost with zero weight and no rewards", () => {
  const resolution = resolve([bubble("coin", 10, { coin: true }), bubble("chest", 10, { col: 1, chest: true })]);
  assert.equal(resolution.result.overflowWeight, 0);
  assert.equal(resolution.result.rawDamage, 6);
  assert.equal(resolution.result.lostCoinBubbleCount, 1);
  assert.equal(resolution.result.lostChestBubbleCount, 1);
  assert.equal(resolution.directContext.grantRewards, false);
});

test("PO-007: Boss core uses weight five without ordinary core behavior", () => {
  const resolution = resolve([bubble("core", 10, { core: true })]);
  assert.equal(resolution.result.overflowWeight, 5);
  assert.equal(resolution.result.rawDamage, 16);
  assert.equal(resolution.directContext.triggerClearEffects, false);
  assert.equal(resolution.directContext.damageEnemy, false);
});

test("PO-008: shield can fully absorb one combined overflow hit after board removal", () => {
  const resolution = resolve([bubble("a", 10), bubble("b", 10, { col: 1 })]);
  const health = createPlayerHealthState({ currentHp: 80, shield: 20 });
  const damage = resolvePlayerDamage(health, {
    eventId: resolution.result.resolveId, sourceId: "PRESSURE_LINE", sourceType: "BOARD_OVERFLOW", damageType: "PRESSURE_OVERFLOW",
    baseValue: resolution.result.finalDamage, canBeBlockedByShield: true, canKillPlayer: true, tags: [],
  });
  assert.equal(damage.state.currentHp, 80);
  assert.equal(damage.state.shield, 10);
  assert.equal(resolution.result.impactedBubbleIds.length, 2);
  assert.equal(resolution.board.length, 0);
});

test("PO-009: fatal damage is reported only after direct and secondary cleanup result exists", () => {
  const resolution = resolve([bubble("impact", 10), bubble("floating", 5)], {
    findDetached: () => ({ kept: [], dropped: [bubble("floating", 5)] }),
  });
  const damage = resolvePlayerDamage(createPlayerHealthState({ currentHp: 5 }), {
    eventId: resolution.result.resolveId, sourceId: "PRESSURE_LINE", sourceType: "BOARD_OVERFLOW", damageType: "PRESSURE_OVERFLOW",
    baseValue: resolution.result.finalDamage, canBeBlockedByShield: true, canKillPlayer: true, tags: [],
  });
  const completed = completePressureOverflowResult(resolution.result, damage.result);
  assert.equal(resolution.board.length, 0);
  assert.deepEqual(completed.secondaryDetachedBubbleIds, ["floating"]);
  assert.equal(completed.playerDownedAfterResolve, true);
});

test("PO-010: death prevention does not restore removed bubbles or repeat resolve", () => {
  const first = resolve([bubble("impact", 10)]);
  const protectedHealth = performDeathPrevent(createPlayerHealthState({ currentHp: 0, isDowned: true }));
  const duplicate = resolve(first.board, { processedResolveIds: first.processedResolveIds });
  assert.equal(protectedHealth.currentHp, 30);
  assert.equal(first.board.length, 0);
  assert.equal(duplicate.result.duplicate, true);
  assert.equal(duplicate.result.finalDamage, 0);
});

test("PO-011: revive changes survival state but cannot restore pressure-removed board", () => {
  const resolution = resolve([bubble("impact", 10), bubble("anchor", 0)]);
  const boardSnapshot = resolution.board.map((item) => item.id);
  const revived = performManualRevive(createPlayerHealthState({ currentHp: 0, isDowned: true, overflowCountThisBattle: 1 }));
  assert.deepEqual(resolution.board.map((item) => item.id), boardSnapshot);
  assert.deepEqual(boardSnapshot, ["anchor"]);
  assert.equal(revived.currentHp, 35);
  assert.equal(revived.overflowCountThisBattle, 1);
});

test("PO-012: repeat multiplier increases once per overflow and caps at two", () => {
  const multipliers = [0, 1, 2, 3, 4, 8].map((count) => calculateOverflowDamage({ bubbles: [bubble("n", 10)], overflowCountBeforeResolve: count, damageCap: 99 }).repeatMultiplier);
  assert.deepEqual(multipliers, [1, 1.25, 1.5, 1.75, 2, 2]);
});

test("PO-013: ordinary player-caused drop context keeps damage and rewards enabled", () => {
  const context = playerBubbleDestroyContexts.PLAYER_CAUSED_DROP;
  assert.equal(context.source, "PLAYER_CAUSED_DROP");
  assert.equal(context.damageEnemy, true);
  assert.equal(context.grantRewards, true);
  assert.equal(context.triggerDropEffects, true);
});

test("PO-014: duplicate resolve id does not deal damage, destroy, or increase count again", () => {
  const first = resolve([bubble("impact", 10)]);
  const duplicate = resolve(first.board, { processedResolveIds: first.processedResolveIds, overflowCountBeforeResolve: first.result.overflowCountAfterResolve });
  assert.equal(duplicate.result.duplicate, true);
  assert.equal(duplicate.result.finalDamage, 0);
  assert.equal(duplicate.result.overflowCountAfterResolve, 1);
  assert.deepEqual(duplicate.board, first.board);
});

test("PO-015: a two-row drop collects every bubble ending beyond the collapse row once", () => {
  const shifted = [bubble("r8", 10), bubble("r9", 11), bubble("safe", 9), bubble("duplicate", 10), bubble("duplicate", 11)];
  assert.deepEqual(collectImpactedBubbles(shifted, 9).map((item) => item.id), ["duplicate", "r8", "r9"]);
});

test("PO-016: invalid config reports warnings and uses safe fallback; override is applied", () => {
  const loaded = loadPressureOverflowConfig({ ...pressureOverflowConfig, damage: { ...pressureOverflowConfig.damage, baseDamage: -1 }, bubbleWeights: { ...pressureOverflowConfig.bubbleWeights, OTHER: Number.NaN } }, { boardDropRows: 2, repeatDamageIncrease: .2 });
  assert.equal(loaded.config.damage.baseDamage, 6);
  assert.equal(loaded.config.bubbleWeights.OTHER, 1);
  assert.equal(loaded.config.boardDropRows, 2);
  assert.equal(loaded.config.damage.repeatDamageIncrease, .2);
  assert.equal(loaded.warnings.length, 2);
});

test("PO-017: unknown bubble type uses safe OTHER weight and is still collected", () => {
  const unknown = bubble("unknown", 10, { color: "mystery" });
  assert.equal(getPressureBubbleWeight(unknown), 1);
  assert.deepEqual(resolve([unknown]).result.impactedBubbleIds, ["unknown"]);
});

test("PO-018: all pressure removal reward switches stay disabled", () => {
  const resolution = resolve([bubble("impact", 10), bubble("coin", 4, { coin: true })], {
    findDetached: () => ({ kept: [], dropped: [bubble("coin", 4, { coin: true })] }),
  });
  for (const context of [resolution.directContext, resolution.secondaryContext]) {
    assert.equal(context.grantRewards, false);
    assert.equal(context.damageEnemy, false);
    assert.equal(context.triggerSpecialEffects, false);
    assert.equal(context.triggerRelics, false);
    assert.equal(context.triggerSkills, false);
    assert.equal(context.countForCombo, false);
    assert.equal(context.countForMission, false);
  }
  assert.equal(resolution.result.lostCoinBubbleCount, 1);
});

test("PO-019: last-row overflow keeps the shifted original board connected to inserted bubbles", () => {
  const inserted = [bubble("new-left", 0, { col: 1 })];
  const shifted = Array.from({ length: 14 }, (_, index) => bubble(`old-${index + 1}`, index + 1, { col: 8 }));
  const bridges = getInsertedRowBridgeCells(inserted, shifted, 1, 13)
    .map(([row, col], index) => bubble(`bridge-${index}`, row, { col }));
  const resolution = resolve([...inserted, ...bridges, ...shifted], {
    collapseRow: 13,
    findDetached: (items) => splitCeilingConnected(items, 13),
  });

  assert.deepEqual(resolution.result.impactedBubbleIds, ["old-14"]);
  assert.deepEqual(resolution.result.secondaryDetachedBubbleIds, []);
  assert.ok(resolution.board.some((item) => item.id === "old-13"));
});
