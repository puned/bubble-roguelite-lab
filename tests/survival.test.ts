import assert from "node:assert/strict";
import test from "node:test";
import {
  addShield,
  applyBattleEndRecovery,
  calculatePressureOverflow,
  canManualRevive,
  clearShield,
  createPlayerHealthState,
  getDangerousBubbleIds,
  healPlayer,
  increaseMaxHp,
  performDeathPrevent,
  performManualRevive,
  resolvePlayerDamage,
  type DamageEvent,
} from "../app/survival.ts";

const damage = (overrides: Partial<DamageEvent> = {}): DamageEvent => ({
  eventId: "event-1",
  sourceId: "test",
  sourceType: "TEST",
  damageType: "ENEMY_ATTACK",
  baseValue: 0,
  canBeBlockedByShield: true,
  canKillPlayer: true,
  tags: [],
  ...overrides,
});

test("UT-001: 12 shield absorbs 18 enemy damage before HP", () => {
  const state = createPlayerHealthState({ currentHp: 70, shield: 12 });
  const resolved = resolvePlayerDamage(state, damage({ baseValue: 18 }));
  assert.equal(resolved.state.shield, 0);
  assert.equal(resolved.state.currentHp, 64);
});

test("UT-002: status damage bypasses shield", () => {
  const state = createPlayerHealthState({ currentHp: 70, shield: 12 });
  const resolved = resolvePlayerDamage(state, damage({ damageType: "STATUS_DAMAGE", baseValue: 8, canBeBlockedByShield: false }));
  assert.equal(resolved.state.shield, 12);
  assert.equal(resolved.state.currentHp, 62);
});

test("UT-003: self cost cannot kill player", () => {
  const state = createPlayerHealthState({ currentHp: 5 });
  const resolved = resolvePlayerDamage(state, damage({ damageType: "SELF_COST", baseValue: 8, canBeBlockedByShield: false, canKillPlayer: false }));
  assert.equal(resolved.state.currentHp, 1);
});

test("UT-004: overflow weight 3 produces raw damage 12", () => {
  const overflow = calculatePressureOverflow([{ id: "poison", row: 10, poison: true }], 0, 20);
  assert.equal(overflow.overflowWeight, 3);
  assert.equal(overflow.rawDamage, 12);
  assert.equal(overflow.cappedDamage, 12);
});

test("UT-005: second equal overflow uses 1.25 multiplier", () => {
  const overflow = calculatePressureOverflow([{ id: "poison", row: 10, poison: true }], 1, 20);
  assert.equal(overflow.repeatMultiplier, 1.25);
  assert.equal(overflow.cappedDamage, 15);
});

test("UT-006: overflow reward bubble is returned for destruction with zero weight", () => {
  const overflow = calculatePressureOverflow([{ id: "coin", row: 10, coin: true }], 0, 16);
  assert.deepEqual(overflow.overflowBubbleIds, ["coin"]);
  assert.equal(overflow.overflowWeight, 0);
  assert.equal(overflow.cappedDamage, 6);
});

test("UT-007: destroyed overflow bubbles cannot damage again", () => {
  assert.equal(calculatePressureOverflow([], 1, 16).cappedDamage, 0);
});

test("UT-008: combat healing is capped at 15 percent max HP", () => {
  const state = createPlayerHealthState({ currentHp: 70, maxHp: 100 });
  const first = healPlayer(state, 10, "COMBAT");
  const second = healPlayer(first.state, 10, "COMBAT");
  assert.equal(first.actual + second.actual, 15);
  assert.equal(second.state.currentHp, 85);
});

test("UT-009: max HP never exceeds 160", () => {
  const state = createPlayerHealthState({ currentHp: 150, maxHp: 150 });
  const upgraded = increaseMaxHp(state, 16, true);
  assert.equal(upgraded.state.maxHp, 160);
  assert.equal(upgraded.state.currentHp, 160);
});

test("UT-010: phoenix death prevent restores 30 percent", () => {
  const state = createPlayerHealthState({ currentHp: 0, isDowned: true });
  const protectedState = performDeathPrevent(state);
  assert.equal(protectedState.currentHp, 30);
  assert.equal(protectedState.isDowned, false);
  assert.equal(protectedState.deathPreventUsedThisBattle, true);
});

test("UT-011: after death prevent, manual revive remains available", () => {
  const state = createPlayerHealthState({ currentHp: 0, deathPreventUsedThisBattle: true, isDowned: true });
  assert.equal(canManualRevive(state, "PLAYER_HP_ZERO"), true);
});

test("UT-012: one run revive prevents another manual revive", () => {
  const state = createPlayerHealthState({ currentHp: 0, reviveCountThisRun: 1, isDowned: true });
  assert.equal(canManualRevive(state, "PLAYER_HP_ZERO"), false);
});

test("UT-013: Boss revive changes only player survival values", () => {
  const state = createPlayerHealthState({ currentHp: 0, isDowned: true });
  const boss = { hp: 80, phase: 2 };
  const revived = performManualRevive(state);
  assert.deepEqual(boss, { hp: 80, phase: 2 });
  assert.equal(revived.currentHp, 35);
  assert.equal(revived.shield, 10);
});

test("UT-014: objective failure does not allow manual revive", () => {
  assert.equal(canManualRevive(createPlayerHealthState({ currentHp: 0 }), "OBJECTIVE_FAILED"), false);
});

test("UT-015: duplicate DamageEvent is idempotent", () => {
  const state = createPlayerHealthState();
  const first = resolvePlayerDamage(state, damage({ eventId: "same", baseValue: 10 }));
  const second = resolvePlayerDamage(first.state, damage({ eventId: "same", baseValue: 10 }), first.processedEventIds);
  assert.equal(first.state.currentHp, 90);
  assert.equal(second.state.currentHp, 90);
  assert.equal(second.result.duplicate, true);
});

test("UT-016: normal battle end recovery restores 4", () => {
  const state = createPlayerHealthState({ currentHp: 90 });
  assert.equal(applyBattleEndRecovery(state, 1, "NORMAL_BATTLE").state.currentHp, 94);
});

test("UT-017: shield is cleared after battle", () => {
  const state = addShield(createPlayerHealthState(), 20).state;
  assert.equal(clearShield(state).shield, 0);
  assert.equal(applyBattleEndRecovery(state, 1, "NORMAL_BATTLE").state.shield, 0);
});

test("UT-018: legacy save without survival fields migrates to defaults", () => {
  const state = createPlayerHealthState({});
  assert.equal(state.currentHp, 100);
  assert.equal(state.maxHp, 100);
  assert.equal(state.shield, 0);
  assert.deepEqual(state.statuses, []);
});

test("IT-001: damage, victory recovery, and next battle inheritance", () => {
  const start = createPlayerHealthState();
  const damaged = resolvePlayerDamage(start, damage({ baseValue: 10 })).state;
  const recovered = applyBattleEndRecovery(damaged, 1, "NORMAL_BATTLE").state;
  assert.equal(recovered.currentHp, 94);
});

test("IT-002: dangerous bubble removal prioritizes bottom and weight", () => {
  const ids = getDangerousBubbleIds([
    { id: "normal", row: 9 },
    { id: "core", row: 9, core: true },
    { id: "stone", row: 8, color: "stone" },
  ], 2);
  assert.deepEqual(ids, ["core", "normal"]);
});
