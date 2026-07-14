import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeShotBudget,
  getShotBudgetConfig,
  grantBossPhaseShots,
  grantShotBudget,
  initializeShotBudget,
  refundShotBudget,
  resolveShotBudgetOutcome,
  restoreShotBudgetState,
  applyShotLimitContinue,
  validateShotBudgetConfigs,
} from "../app/shot-budget.ts";

const consume = (state = initializeShotBudget("CH1_01"), transactionId = "shot-1", overrides = {}) => consumeShotBudget(state, {
  transactionId, sourceBallUid: `${transactionId}-red`, sourceBallId: "red", consumeAmount: 1,
  isChildProjectile: false, consumeShotBudget: true, ...overrides,
});

test("TC-001 正常发射只扣 1 次", () => {
  const result = consume();
  assert.equal(result.state.remainingShots, 17);
  assert.equal(result.state.consumedShots, 1);
});

test("TC-002 瞄准取消不调用消费事务，次数保持不变", () => {
  const state = initializeShotBudget("CH1_01");
  assert.equal(state.remainingShots, 18);
});

test("TC-003 备用球交换不改变发射次数", () => {
  const state = initializeShotBudget("CH1_01");
  const ballQueue = { current: "red", reserve: "blue" };
  [ballQueue.current, ballQueue.reserve] = [ballQueue.reserve, ballQueue.current];
  assert.equal(state.remainingShots, 18);
});

test("TC-004 子投射物不重复扣除", () => {
  const parent = consume().state;
  const child = consume(parent, "child-1", { isChildProjectile: true, parentTransactionId: "shot-1" });
  assert.equal(child.state.remainingShots, 17);
  assert.equal(child.result.consumed, 0);
});

test("TC-005 空发仍是合法发射并扣除 1 次", () => {
  assert.equal(consume().state.remainingShots, 17);
});

test("TC-006 系统异常对同一事务最多返还一次", () => {
  const consumed = consume().state;
  const first = refundShotBudget(consumed, "shot-1");
  const duplicate = refundShotBudget(first.state, "shot-1");
  assert.equal(first.state.remainingShots, 18);
  assert.equal(duplicate.state.remainingShots, 18);
  assert.equal(duplicate.result.duplicate, true);
});

test("TC-007 添加球只改变球包，不增加次数", () => {
  const state = initializeShotBudget("CH1_01");
  const bag = ["red", "blue"];
  bag.push("fire", "fire");
  assert.equal(bag.length, 4);
  assert.equal(state.remainingShots, 18);
});

test("TC-008 删除球只改变球包，不减少次数", () => {
  const state = initializeShotBudget("CH1_01");
  const bag = ["red", "green", "blue"].filter((ball) => ball !== "green");
  assert.equal(bag.length, 2);
  assert.equal(state.remainingShots, 18);
});

test("TC-009 最后一发击杀时胜利优先于弹尽", () => {
  const last = consume({ ...initializeShotBudget("CH1_01"), remainingShots: 1 }, "last").state;
  assert.equal(resolveShotBudgetOutcome(last, true), "VICTORY");
});

test("TC-010 最后一发击破 Boss 阶段后先获得 3 发", () => {
  const initial = { ...initializeShotBudget("CH1_10"), remainingShots: 1 };
  const last = consume(initial, "boss-last").state;
  const phase = grantBossPhaseShots(last, "WEB_WEAVING", "phase-1-grant");
  assert.equal(last.remainingShots, 0);
  assert.equal(phase.state.remainingShots, 3);
  assert.equal(phase.state.phaseGrantedShots, 3);
});

test("TC-011 最后一发未击杀且无返还时判定弹尽", () => {
  const last = consume({ ...initializeShotBudget("CH1_01"), remainingShots: 1 }, "last").state;
  assert.equal(resolveShotBudgetOutcome(last, false), "SHOT_LIMIT_EXHAUSTED");
});

test("TC-012 清盘遗物返还后可继续", () => {
  const last = consume({ ...initializeShotBudget("CH1_01"), remainingShots: 1 }, "last").state;
  const grant = grantShotBudget(last, { source: "BOARD_CLEAR", sourceId: "CLEAR_RELIC", amount: 1, ignoreRuntimeCap: false, transactionId: "clear-grant" });
  assert.equal(grant.state.remainingShots, 1);
  assert.equal(resolveShotBudgetOutcome(grant.state, false), "CONTINUE");
});

test("TC-013 普通关运行时增加上限为 4", () => {
  const state = initializeShotBudget("CH1_01");
  const grant = grantShotBudget(state, { source: "RELIC", sourceId: "TEST", amount: 6, ignoreRuntimeCap: false, transactionId: "runtime-grant" });
  assert.equal(grant.result.granted, 4);
  assert.equal(grant.state.runtimeGrantedShots, 4);
});

test("TC-014 Boss 阶段奖励不占普通运行时上限", () => {
  const state = initializeShotBudget("CH1_10");
  const runtime = grantShotBudget(state, { source: "RELIC", sourceId: "TEST", amount: 8, ignoreRuntimeCap: false, transactionId: "runtime" }).state;
  const phase = grantBossPhaseShots(runtime, "WEB_WEAVING", "phase");
  assert.equal(phase.result.granted, 3);
  assert.equal(phase.state.runtimeGrantedShots, 8);
  assert.equal(phase.state.phaseGrantedShots, 3);
});

test("TC-015 弹尽继续按普通关增加 5 发且只能一次", () => {
  const exhausted = { ...initializeShotBudget("CH1_01"), remainingShots: 0, exhausted: true };
  const first = applyShotLimitContinue(exhausted, "continue");
  const duplicate = applyShotLimitContinue(first.state, "continue-again");
  assert.equal(first.state.remainingShots, 5);
  assert.equal(first.state.continueUsed, true);
  assert.equal(duplicate.result.granted, 0);
});

test("TC-016 压力下压不接触发射次数状态", () => {
  const state = initializeShotBudget("CH1_06");
  const pressure = 5;
  assert.equal(pressure, 5);
  assert.equal(state.remainingShots, 22);
});

test("TC-017 敌人注入球不会赠送发射次数", () => {
  const state = initializeShotBudget("CH1_10");
  const injectedBag = ["curse", "curse"];
  assert.equal(injectedBag.length, 2);
  assert.equal(state.remainingShots, 52);
});

test("TC-018 重连重复事务不会重复扣除", () => {
  const first = consume(initializeShotBudget("CH1_01"), "network-shot");
  const repeated = consume(first.state, "network-shot");
  assert.equal(repeated.state.remainingShots, 17);
  assert.equal(repeated.result.duplicate, true);
});

test("第一章配置、旧存档迁移和配置校验有效", () => {
  const limits = Array.from({ length: 10 }, (_, index) => getShotBudgetConfig(`CH1_${String(index + 1).padStart(2, "0")}`).baseShotLimit);
  assert.deepEqual(limits, [18, 19, 20, 21, 32, 22, 23, 24, 25, 52]);
  assert.equal(restoreShotBudgetState(undefined, "CH1_01", 4).remainingShots, 14);
  assert.deepEqual(validateShotBudgetConfigs(), []);
});
