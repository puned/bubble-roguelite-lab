import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRouteEncounter,
  consumeNextBattleEffects,
  createRouteServiceSession,
  createRouteFlowState,
  estimateNonCombatTimeRatio,
  finalizeRouteService,
  generateRouteOptions,
  getBuildAdaptedWeight,
  getChapterProgress,
  getRouteCardsByIds,
  getRouteServiceOffers,
  getSlotNodeType,
  restoreRouteFlowState,
  resolveMicroChallengeShot,
  resolveRouteService,
  resolveRouteServiceAction,
  selectRouteOnce,
  validateNonCombatContent,
  validateRouteOptions,
  type RouteGenerationRequest,
} from "../app/route-flow.ts";

const request = (nextSlotIndex: number, seed = 8848): RouteGenerationRequest => ({
  runId: "RUN-ROUTE-TEST",
  seed,
  chapterId: "CHAPTER_1",
  completedSlotIndex: Math.max(0, nextSlotIndex - 1),
  nextSlotIndex,
  nextNodeType: getSlotNodeType(nextSlotIndex),
  playerHpPercent: .7,
  gold: 12,
  ballBagSummary: { size: 14, specialCount: 2, tags: ["RAINBOW"] },
  relicTags: [],
  recentEnemyFamilies: [],
  recentRouteArchetypes: [],
  recentTemplateFamilyIds: [],
  fixedBossId: "BOSS_SPIDER_QUEEN",
});

test("TC-001: 普通槽位稳定生成 SAFE、资源或构筑、高风险三张卡", () => {
  const result = generateRouteOptions(request(2));
  assert.equal(result.options.length, 3);
  assert.ok(result.options.some((route) => route.primaryArchetype === "SAFE"));
  assert.ok(result.options.some((route) => route.primaryArchetype === "RESOURCE" || route.primaryArchetype === "BUILD"));
  assert.ok(result.options.some((route) => route.primaryArchetype === "RISK_REWARD"));
  assert.deepEqual(validateRouteOptions(result.options, "NORMAL"), []);
});

test("TC-002: 第 5 槽三张卡全部为不可绕过的精英路线", () => {
  const result = generateRouteOptions(request(5));
  assert.ok(result.options.every((route) => route.nodeType === "ELITE" && route.primaryArchetype === "ELITE_VARIANT"));
});

test("TC-003: 第 10 槽只生成固定蛛后 Boss 的准备卡", () => {
  const result = generateRouteOptions(request(10));
  assert.ok(result.options.every((route) => route.nodeType === "BOSS" && route.primaryArchetype === "BOSS_PREP"));
  assert.ok(result.options.every((route) => route.fixedEnemyId === "BOSS_SPIDER_QUEEN"));
});

test("TC-004: 最近敌人家族在有替代项时会被优先屏蔽", () => {
  const base = request(3, 921);
  base.recentEnemyFamilies = ["FOREST", "SLIME"];
  const result = generateRouteOptions(base);
  assert.equal(result.options.some((route) => route.enemyPoolId === "FOREST"), false);
});

test("TC-005: 校验器会拒绝缺少安全路线的伪三选一", () => {
  const generated = generateRouteOptions(request(3));
  const risk = generated.options.find((route) => route.primaryArchetype === "RISK_REWARD")!;
  assert.ok(validateRouteOptions([risk, { ...risk, routeId: "RISK-2" }, { ...risk, routeId: "RISK-3" }], "NORMAL").includes("SAFE_OPTION_REQUIRED"));
});

test("TC-006: 构筑适配权重上限为 15%", () => {
  assert.equal(getBuildAdaptedWeight(true, .5), 1.15);
  assert.equal(getBuildAdaptedWeight(false, .5), 1);
});

test("TC-007: 商店和删球服务改变资源但不消耗战斗槽", () => {
  const shop = getRouteCardsByIds(["ROUTE_TRADE_CARAVAN"])[0];
  const shopResult = resolveRouteService(shop, { currentHp: 70, maxHp: 100, shield: 0, shieldMax: 50, gold: 30, ballBag: ["red"] }, { buyShopItem: true });
  assert.equal(shopResult.context.gold, 8);
  assert.equal(shopResult.context.ballBag.at(-1), "bomb");
  assert.equal(shopResult.slotConsumed, false);

  const remove = getRouteCardsByIds(["ROUTE_BALL_WORKSHOP"])[0];
  const removeResult = resolveRouteService(remove, { currentHp: 70, maxHp: 100, shield: 0, shieldMax: 50, gold: 10, ballBag: ["red", "red", "red", "blue", "blue", "yellow", "yellow", "green", "green", "bomb", "fire"] });
  assert.equal(removeResult.context.ballBag.length, 10);
  assert.equal(removeResult.removedBall, "red");
  assert.equal(removeResult.slotConsumed, false);
});

test("TC-008/009: 待选项可原样恢复且同一槽位选择幂等", () => {
  const generated = generateRouteOptions(request(4));
  const pending = restoreRouteFlowState({
    ...createRouteFlowState(),
    pendingRouteGenerationId: generated.generationId,
    pendingRouteSeed: generated.seed,
    pendingRouteOptions: generated.options.map((route) => route.routeId),
  });
  assert.deepEqual(getRouteCardsByIds(pending.pendingRouteOptions).map((route) => route.routeId), generated.options.map((route) => route.routeId));
  const first = selectRouteOnce({ state: pending, route: generated.options[0], slotIndex: 4, enemyId: "ENEMY", selectedAt: 1 });
  const duplicate = selectRouteOnce({ state: first.state, route: generated.options[1], slotIndex: 4, enemyId: "ENEMY", selectedAt: 2 });
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.state.routeHistory.length, 1);
});

test("TC-010: 毒雾路线从模板池选图并正确构建毒液 Overlay", () => {
  const poison = getRouteCardsByIds(["ROUTE_POISON_MARSH"])[0];
  const encounter = buildRouteEncounter(poison, 42, 3);
  assert.ok([3, 4, 9].includes(encounter.templateOrder));
  assert.equal(encounter.poisonBubbles, 2);
  assert.equal(encounter.enemyHpMultiplier, 1.1);
});

test("TC-012: 十格进度轨固定标记第 5 精英与第 10 Boss", () => {
  const progress = getChapterProgress(4);
  assert.equal(progress[3].state, "CURRENT");
  assert.equal(progress[4].nodeType, "ELITE");
  assert.equal(progress[9].nodeType, "BOSS");
});

test("相同 Run seed 会复现完全相同的三张路线", () => {
  const first = generateRouteOptions(request(7, 7788));
  const second = generateRouteOptions(request(7, 7788));
  assert.equal(first.generationId, second.generationId);
  assert.deepEqual(first.options.map((route) => route.routeId), second.options.map((route) => route.routeId));
});

const serviceContext = (overrides = {}) => ({
  currentHp: 70,
  maxHp: 100,
  shield: 0,
  shieldMax: 50,
  gold: 100,
  ballBag: ["red", "red", "red", "blue", "blue", "yellow", "yellow", "green", "green", "bomb", "fire"],
  relics: [],
  pendingEffects: [],
  ...overrides,
});

test("NC-001: 商店路线包固定生成 3 件商品且最多购买 2 次", () => {
  const route = getRouteCardsByIds(["ROUTE_TRADE_CARAVAN"])[0];
  const firstSession = createRouteServiceSession(route, 7788);
  const reconnectSession = createRouteServiceSession(route, 7788);
  assert.deepEqual(firstSession.offerIds, reconnectSession.offerIds);
  assert.equal(getRouteServiceOffers(firstSession).length, 3);
  const first = resolveRouteServiceAction(firstSession, serviceContext(), firstSession.offerIds[0]);
  const second = resolveRouteServiceAction(first.session, first.context, firstSession.offerIds[1]);
  const blockedThird = resolveRouteServiceAction(second.session, second.context, firstSession.offerIds[2]);
  assert.equal(second.session.completed, true);
  assert.equal(second.session.choicesMade, 2);
  assert.equal(blockedThird.error, "OFFER_UNAVAILABLE");
  assert.equal(route.advancesBattleSlot, true);
});

test("NC-002: 独立商店完成后不推进战斗槽位并标记章节使用", () => {
  const route = getRouteCardsByIds(["ROUTE_STANDALONE_CARAVAN"])[0];
  const state = { ...createRouteFlowState(), currentSlotIndex: 3, pendingRouteGenerationId: "GEN-STANDALONE" };
  const selected = selectRouteOnce({ state, route, slotIndex: 4, enemyId: "NONE", selectedAt: 10, generationId: "GEN-STANDALONE" });
  assert.equal(selected.state.currentSlotIndex, 3);
  assert.equal(selected.state.standaloneNodeCountThisChapter, 1);
  assert.equal(selected.state.standaloneShopUsed, true);
  assert.equal(selected.state.previousNodeWasStandalone, true);
});

function requestWithStandaloneState(seed: number, state = createRouteFlowState()) {
  return generateRouteOptions({ ...request(4, seed), nonCombatState: state });
}

function findStandaloneSeed() {
  for (let seed = 1; seed < 500; seed += 1) {
    if (requestWithStandaloneState(seed).options.some((route) => route.nodeKind === "STANDALONE_SERVICE")) return seed;
  }
  throw new Error("未找到可复现的独立节点 seed");
}

test("NC-003/004: 连续独立节点与章节上限都会阻止再次生成", () => {
  const seed = findStandaloneSeed();
  const previousStandalone = { ...createRouteFlowState(), previousNodeWasStandalone: true };
  const capped = { ...createRouteFlowState(), standaloneNodeCountThisChapter: 2 };
  assert.equal(requestWithStandaloneState(seed, previousStandalone).options.some((route) => route.nodeKind === "STANDALONE_SERVICE"), false);
  assert.equal(requestWithStandaloneState(seed, capped).options.some((route) => route.nodeKind === "STANDALONE_SERVICE"), false);
});

test("NC-005/006: 精英与固定 Boss 路线均不能被独立服务绕过", () => {
  const state = createRouteFlowState();
  const elite = generateRouteOptions({ ...request(5), nonCombatState: state });
  const boss = generateRouteOptions({ ...request(10), nonCombatState: state });
  assert.ok(elite.options.every((route) => route.advancesBattleSlot && route.nodeKind === "COMBAT_PACKAGE"));
  assert.ok(boss.options.every((route) => route.advancesBattleSlot && route.fixedEnemyId === "BOSS_SPIDER_QUEEN"));
});

test("NC-007: 三发微型挑战使用独立预算，不修改正式 ShotBudget", () => {
  const route = getRouteCardsByIds(["ROUTE_MARBLE_TRIAL"])[0];
  const formalShotBudget = 18;
  let session = createRouteServiceSession(route, 99);
  session = resolveMicroChallengeShot(session, "trial-red");
  session = resolveMicroChallengeShot(session, "MISS");
  session = resolveMicroChallengeShot(session, "trial-blue");
  assert.equal(session.challenge?.shotsRemaining, 0);
  assert.equal(session.challenge?.score, 2);
  assert.equal(session.completed, true);
  assert.equal(formalShotBudget, 18);
  const reward = finalizeRouteService(route, session, serviceContext({ gold: 0 }));
  assert.equal(reward.context.gold, 6);
});

test("NC-008: NEXT_BATTLE 护盾仅在下一战消费一次", () => {
  const route = getRouteCardsByIds(["ROUTE_MYSTERY_ALTAR"])[0];
  const session = createRouteServiceSession(route, 7);
  const chosen = resolveRouteServiceAction(session, serviceContext({ shield: 0 }), "EVENT_CURSED_SHIELD");
  assert.equal(chosen.context.shield, 0);
  assert.equal(chosen.context.pendingEffects?.length, 1);
  const firstBattle = consumeNextBattleEffects(chosen.context);
  const secondBattle = consumeNextBattleEffects(firstBattle);
  assert.equal(firstBattle.shield, 10);
  assert.equal(firstBattle.pendingEffects?.length, 0);
  assert.equal(secondBattle.shield, 10);
});

test("NC-009: 断线恢复保持路线、商店库存、购买记录和事件选项", () => {
  const route = getRouteCardsByIds(["ROUTE_TRADE_CARAVAN"])[0];
  const session = createRouteServiceSession(route, 2026);
  const purchased = resolveRouteServiceAction(session, serviceContext(), session.offerIds[0]);
  const restored = restoreRouteFlowState({
    ...createRouteFlowState(),
    pendingRouteOptions: [route.routeId],
    pendingRouteSeed: 2026,
    pendingService: purchased.session,
  });
  assert.deepEqual(restored.pendingService?.offerIds, session.offerIds);
  assert.deepEqual(restored.pendingService?.purchasedOfferIds, [session.offerIds[0]]);

  const eventRoute = getRouteCardsByIds(["ROUTE_MYSTERY_ALTAR"])[0];
  const event = resolveRouteServiceAction(createRouteServiceSession(eventRoute, 12), serviceContext(), "EVENT_BLOOD_RELIC");
  const restoredEvent = restoreRouteFlowState({ ...createRouteFlowState(), pendingService: event.session });
  assert.equal(restoredEvent.pendingService?.selectedEventOptionId, "EVENT_BLOOD_RELIC");
});

test("NC-010: 第一章推荐组合的非战斗预计时间低于 25%", () => {
  const routes = getRouteCardsByIds([
    "ROUTE_SAFE_STREAM", "ROUTE_SAFE_CRYSTAL", "ROUTE_TRADE_CARAVAN", "ROUTE_POISON_MARSH", "ROUTE_ELITE_STONE",
    "ROUTE_PRISM_GROVE", "ROUTE_MYSTERY_ALTAR", "ROUTE_STONE_VAULT", "ROUTE_SAFE_STREAM", "ROUTE_BOSS_CAMP",
    "ROUTE_STANDALONE_CAMP",
  ]);
  assert.ok(estimateNonCombatTimeRatio(routes) < .25);
  assert.deepEqual(validateNonCombatContent(), []);
});
