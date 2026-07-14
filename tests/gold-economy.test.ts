import assert from "node:assert/strict";
import test from "node:test";
import {
  applyGoldTransaction,
  buildEconomyShopInventory,
  calculateBattleGold,
  commitBattleGold,
  convertRunGold,
  createRunGoldState,
  getChapterShopPrice,
  getCreditedCoinBubbleCount,
  getCurseCleansePrice,
  getRemoveBallPrice,
  getShopRerollPrice,
  isLegalCoinBubbleClear,
} from "../app/gold-economy.ts";

test("ECON-TC-001: Run 从 10 金币开始且初始注入上限为 25", () => {
  assert.equal(createRunGoldState().currentGold, 10);
  assert.equal(createRunGoldState(99).currentGold, 25);
  assert.equal(createRunGoldState().earnedBySource.RUN_START, 10);
});

test("ECON-TC-002: 玩家直接、特殊和主动断连清除可计金币泡泡", () => {
  assert.equal(isLegalCoinBubbleClear("DIRECT_MATCH"), true);
  assert.equal(isLegalCoinBubbleClear("PLAYER_SPECIAL_CLEAR"), true);
  assert.equal(isLegalCoinBubbleClear("PLAYER_CREATED_DETACH"), true);
  assert.equal(getCreditedCoinBubbleCount("NORMAL", 9), 5);
  assert.equal(getCreditedCoinBubbleCount("ELITE", 9), 7);
});

test("ECON-TC-003: 下压、系统清盘和敌人效果不产生金币泡泡收益", () => {
  assert.equal(isLegalCoinBubbleClear("PRESSURE_OVERFLOW"), false);
  assert.equal(isLegalCoinBubbleClear("SECONDARY_DROP"), false);
  assert.equal(isLegalCoinBubbleClear("SYSTEM_CLEAR"), false);
  assert.equal(isLegalCoinBubbleClear("ENEMY_EFFECT"), false);
});

test("ECON-TC-004: 普通战将基础、泡泡、表现、路线和遗物按规定合并", () => {
  const result = calculateBattleGold({
    battleRewardId: "B1", levelId: "CH1_01", nodeType: "NORMAL",
    coinBubbleCount: 8, noPressureOverflow: true, noHpDamage: true,
    remainingShotRatio: .25, playerBoardClearCount: 1, routeGoldMultiplier: 1.2, relicGold: 2,
  });
  assert.equal(result.coinBubbleCount, 5);
  assert.equal(result.performanceGold, 4);
  assert.equal(result.routeModifierGold, 5);
  assert.equal(result.totalGold, 31);
});

test("ECON-TC-005: 精英固定奖励与表现上限生效", () => {
  const result = calculateBattleGold({
    battleRewardId: "B5", levelId: "CH1_05", nodeType: "ELITE_BATTLE",
    coinBubbleCount: 9, noPressureOverflow: true, noHpDamage: true,
    remainingShotRatio: .5, playerBoardClearCount: 1, routeGoldMultiplier: 1.2, relicGold: 2,
  });
  assert.equal(result.baseGold, 22);
  assert.equal(result.fixedEncounterBonus, 6);
  assert.equal(result.performanceGold, 5);
  assert.equal(result.totalGold, 58);
});

test("ECON-TC-006: Boss 金币泡泡每阶段至多 3、全战至多 9", () => {
  const result = calculateBattleGold({
    battleRewardId: "B10", levelId: "CH1_10", nodeType: "BOSS_BATTLE",
    bossCoinBubbleCountsByPhase: [5, 2, 8], noPressureOverflow: true,
    noHpDamage: true, remainingShotRatio: .5, playerBoardClearCount: 1,
    routeGoldMultiplier: 1.25,
  });
  assert.equal(result.coinBubbleCount, 8);
  assert.equal(result.performanceGold, 6);
  assert.equal(result.totalGold, 84);
});

test("ECON-TC-007: 同一战斗奖励只能提交一次", () => {
  const breakdown = calculateBattleGold({ battleRewardId: "UNIQUE-BATTLE", levelId: "CH1_02", nodeType: "NORMAL" });
  const first = commitBattleGold(createRunGoldState(), breakdown);
  const duplicate = commitBattleGold(first.state, breakdown);
  assert.equal(first.applied, true);
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.state.currentGold, 21);
});

test("ECON-TC-008: 消费原子化、幂等且余额不会为负", () => {
  const state = createRunGoldState(20);
  const rejected = applyGoldTransaction(state, { transactionId: "BUY-1", amount: -22, sink: "BUY_BALL" });
  assert.equal(rejected.error, "INSUFFICIENT_GOLD");
  assert.equal(rejected.state.currentGold, 20);
  const bought = applyGoldTransaction(state, { transactionId: "BUY-2", amount: -12, sink: "BUY_BALL" });
  const duplicate = applyGoldTransaction(bought.state, { transactionId: "BUY-2", amount: -12, sink: "BUY_BALL" });
  assert.equal(bought.state.currentGold, 8);
  assert.equal(bought.state.shopPurchaseCountThisRun, 1);
  assert.equal(duplicate.state.currentGold, 8);
});

test("ECON-TC-009: 第一章商店固定价格正确", () => {
  assert.equal(getChapterShopPrice("SHOP_NORMAL_PAIR"), 12);
  assert.equal(getChapterShopPrice("SHOP_FIRE"), 22);
  assert.equal(getChapterShopPrice("SHOP_RAINBOW"), 32);
  assert.equal(getChapterShopPrice("SHOP_RELIC"), 45);
  assert.equal(getChapterShopPrice("SHOP_HEAL"), 18);
  assert.equal(getChapterShopPrice("SHOP_SHIELD"), 12);
  assert.equal(getChapterShopPrice("SHOP_SHOTS"), 20);
});

test("ECON-TC-010: 删球与净化按本局次数递增并封顶", () => {
  assert.deepEqual([0, 1, 2, 3, 8].map(getRemoveBallPrice), [32, 48, 64, 80, 80]);
  assert.deepEqual([0, 1, 2, 3, 8].map(getCurseCleansePrice), [26, 36, 46, 56, 56]);
});

test("ECON-TC-011: 商店库存同种子复现且始终有可负担商品", () => {
  const input = { routeId: "SHOP", seed: 2026, currentGold: 15 };
  const first = buildEconomyShopInventory(input);
  const second = buildEconomyShopInventory(input);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.ok(first.some((offerId) => getChapterShopPrice(offerId) <= 15));
});

test("ECON-TC-012: 少于 12 金币时提供离店加 3 金币保底", () => {
  const inventory = buildEconomyShopInventory({ routeId: "SHOP", seed: 8, currentGold: 11 });
  assert.ok(inventory.includes("SHOP_LEAVE_GRANT_3"));
  assert.equal(getChapterShopPrice("SHOP_LEAVE_GRANT_3"), 0);
});

test("ECON-TC-013: 同一商店重抽价格为 8、14、20 且最多三次", () => {
  assert.deepEqual([0, 1, 2, 3].map((count) => getShopRerollPrice(count)), [8, 14, 20, undefined]);
});

test("ECON-TC-014: 失败按 10:1 转换、封顶 15，并清空 RunGold", () => {
  const earned = applyGoldTransaction(createRunGoldState(10), { transactionId: "EVENT-190", amount: 190, source: "EVENT" });
  const conversion = convertRunGold(earned.state, "FAILED", "RUN-END-FAIL");
  assert.equal(conversion.convertedMetaCurrency, 15);
  assert.equal(conversion.state.currentGold, 0);
  assert.equal(conversion.state.runEnded, true);
});

test("ECON-TC-015: 胜利按 8:1 转换且第一章固定战斗金币为 182", () => {
  const chapterFixed = Array.from({ length: 10 }, (_, index) => {
    const levelId = `CH1_${String(index + 1).padStart(2, "0")}`;
    const result = calculateBattleGold({ battleRewardId: levelId, levelId, nodeType: index === 4 ? "ELITE" : index === 9 ? "BOSS" : "NORMAL" });
    return result.baseGold + result.fixedEncounterBonus;
  }).reduce((sum, value) => sum + value, 0);
  assert.equal(chapterFixed, 182);
  const earned = applyGoldTransaction(createRunGoldState(10), { transactionId: "EVENT-190", amount: 190, source: "EVENT" });
  const conversion = convertRunGold(earned.state, "VICTORY", "RUN-END-WIN");
  assert.equal(conversion.convertedMetaCurrency, 25);
  assert.equal(conversion.state.currentGold, 0);
});

test("任务书 TC-001/002: CH1-01 无额外条件为 10，合法清除 3 金币泡泡为 6", () => {
  const plain = calculateBattleGold({ battleRewardId: "DOC-1", levelId: "CH1_01", nodeType: "NORMAL" });
  const coins = calculateBattleGold({ battleRewardId: "DOC-2", levelId: "CH1_01", nodeType: "NORMAL", coinBubbleCount: 3 });
  assert.equal(plain.totalGold, 10);
  assert.equal(coins.coinBubbleGold, 6);
});

test("任务书 TC-011/012: 失败剩余 87 转 8，剩余 300 时封顶 15", () => {
  const toBalance = (balance: number, id: string) => applyGoldTransaction(createRunGoldState(10), { transactionId: id, amount: balance - 10, source: "EVENT" }).state;
  assert.equal(convertRunGold(toBalance(87, "BALANCE-87"), "FAILED", "FAIL-87").convertedMetaCurrency, 8);
  assert.equal(convertRunGold(toBalance(300, "BALANCE-300"), "FAILED", "FAIL-300").convertedMetaCurrency, 15);
});

test("任务书 TC-013/014: 通关 200 转 25，第二章普通遗物价格为 54", () => {
  const balance200 = applyGoldTransaction(createRunGoldState(10), { transactionId: "BALANCE-200", amount: 190, source: "EVENT" }).state;
  assert.equal(convertRunGold(balance200, "VICTORY", "WIN-200").convertedMetaCurrency, 25);
  assert.equal(getChapterShopPrice("SHOP_RELIC", undefined, 2), 54);
});

test("任务书 TC-015: 重连重放同一购买事务只扣一次", () => {
  const balance50 = applyGoldTransaction(createRunGoldState(25), { transactionId: "RECONNECT-EARN", amount: 25, source: "EVENT" }).state;
  const first = applyGoldTransaction(balance50, { transactionId: "RECONNECT-BUY", amount: -22, sink: "BUY_BALL" });
  const replay = applyGoldTransaction(first.state, { transactionId: "RECONNECT-BUY", amount: -22, sink: "BUY_BALL" });
  assert.equal(first.state.currentGold, 28);
  assert.equal(replay.applied, false);
  assert.equal(replay.state.currentGold, 28);
  assert.equal(replay.state.shopPurchaseCountThisRun, 1);
});
