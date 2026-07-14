export type GoldSourceType =
  | "RUN_START"
  | "BATTLE_BASE"
  | "COIN_BUBBLE"
  | "PERFORMANCE"
  | "ROUTE_MODIFIER"
  | "RELIC"
  | "EVENT"
  | "ELITE_BONUS"
  | "BOSS_BONUS"
  | "REFUND";

export type GoldSinkType =
  | "BUY_BALL"
  | "REMOVE_BALL"
  | "TRANSFORM_BALL"
  | "BUY_RELIC"
  | "HEAL"
  | "BUY_SHIELD"
  | "BUY_SHOTS"
  | "CLEANSE_CURSE"
  | "SHOP_REROLL"
  | "EVENT_COST"
  | "ROUTE_TOLL";

export type RunGoldState = {
  currentGold: number;
  totalEarnedThisRun: number;
  totalSpentThisRun: number;
  earnedBySource: Partial<Record<GoldSourceType, number>>;
  spentBySink: Partial<Record<GoldSinkType, number>>;
  shopPurchaseCountThisRun: number;
  ballRemoveCountThisRun: number;
  curseCleanseCountThisRun: number;
  shopRerollCountThisRun: number;
  committedBattleRewardIds: string[];
  processedTransactionIds: string[];
  runEnded: boolean;
};

export type MetaCurrencyState = { currentMetaCurrency: number };
export type PremiumCurrencyState = { currentPremiumCurrency: number };

export type GoldTransactionRequest = {
  transactionId: string;
  amount: number;
  source?: GoldSourceType;
  sink?: GoldSinkType;
};

export type GoldTransactionResult = {
  state: RunGoldState;
  applied: boolean;
  error?: "INVALID_TRANSACTION" | "INSUFFICIENT_GOLD" | "RUN_ENDED";
};

export type BattleNodeType = "NORMAL" | "ELITE" | "BOSS" | "NORMAL_BATTLE" | "ELITE_BATTLE" | "BOSS_BATTLE";

export type BattleGoldBreakdown = {
  battleRewardId: string;
  levelId: string;
  nodeType: "NORMAL" | "ELITE" | "BOSS";
  baseGold: number;
  coinBubbleCount: number;
  coinBubbleGold: number;
  performanceGold: number;
  fixedEncounterBonus: number;
  extraEncounterBonus: number;
  routeMultiplier: number;
  routeModifierGold: number;
  relicGold: number;
  totalGold: number;
  sourceBreakdown: Partial<Record<GoldSourceType, number>>;
};

export type BattleGoldInput = {
  battleRewardId: string;
  levelId: string;
  nodeType: BattleNodeType;
  coinBubbleCount?: number;
  bossCoinBubbleCountsByPhase?: number[];
  noPressureOverflow?: boolean;
  noHpDamage?: boolean;
  remainingShotRatio?: number;
  playerBoardClearCount?: number;
  routeGoldMultiplier?: number;
  relicGold?: number;
  extraEncounterBonus?: number;
};

export const goldEconomyConfig = {
  version: "v1",
  runStartGold: 10,
  runStartGoldCap: 25,
  coinBubbleValue: 2,
  coinBubbleCaps: { NORMAL: 5, ELITE: 7, BOSS_PHASE: 3, BOSS_TOTAL: 9 },
  performance: {
    noPressureOverflow: 2,
    noHpDamage: 2,
    remainingShotsAtLeast25Percent: 1,
    playerBoardClear: 1,
    caps: { NORMAL: 4, ELITE: 5, BOSS: 6 },
  },
  maximumRouteMultiplier: 1.25,
  battleRewards: {
    CH1_01: { baseGold: 10, fixedEncounterBonus: 0 },
    CH1_02: { baseGold: 11, fixedEncounterBonus: 0 },
    CH1_03: { baseGold: 12, fixedEncounterBonus: 0 },
    CH1_04: { baseGold: 13, fixedEncounterBonus: 0 },
    CH1_05: { baseGold: 22, fixedEncounterBonus: 6 },
    CH1_06: { baseGold: 14, fixedEncounterBonus: 0 },
    CH1_07: { baseGold: 15, fixedEncounterBonus: 0 },
    CH1_08: { baseGold: 16, fixedEncounterBonus: 0 },
    CH1_09: { baseGold: 18, fixedEncounterBonus: 0 },
    CH1_10: { baseGold: 35, fixedEncounterBonus: 10 },
  } as Record<string, { baseGold: number; fixedEncounterBonus: number }>,
  conversion: {
    FAILED: { divisor: 10, cap: 15 },
    VICTORY: { divisor: 8, cap: 30 },
  },
} as const;

function cloneGoldState(state: RunGoldState): RunGoldState {
  return {
    ...state,
    earnedBySource: { ...state.earnedBySource },
    spentBySink: { ...state.spentBySink },
    committedBattleRewardIds: [...state.committedBattleRewardIds],
    processedTransactionIds: [...state.processedTransactionIds],
  };
}

function addRecordValue<T extends string>(record: Partial<Record<T, number>>, key: T, value: number) {
  record[key] = (record[key] ?? 0) + value;
}

export function createRunGoldState(startGold: number = goldEconomyConfig.runStartGold): RunGoldState {
  const initialGold = Math.max(0, Math.min(goldEconomyConfig.runStartGoldCap, Math.floor(startGold)));
  return {
    currentGold: initialGold,
    totalEarnedThisRun: initialGold,
    totalSpentThisRun: 0,
    earnedBySource: initialGold > 0 ? { RUN_START: initialGold } : {},
    spentBySink: {},
    shopPurchaseCountThisRun: 0,
    ballRemoveCountThisRun: 0,
    curseCleanseCountThisRun: 0,
    shopRerollCountThisRun: 0,
    committedBattleRewardIds: [],
    processedTransactionIds: [],
    runEnded: false,
  };
}

export function restoreRunGoldState(saved?: Partial<RunGoldState>, legacyGold?: number): RunGoldState {
  if (!saved || typeof saved.currentGold !== "number") {
    if (typeof legacyGold !== "number") return createRunGoldState();
    const restoredGold = Math.max(0, Math.floor(legacyGold));
    return {
      ...createRunGoldState(0),
      currentGold: restoredGold,
      totalEarnedThisRun: restoredGold,
      earnedBySource: restoredGold > 0 ? { RUN_START: restoredGold } : {},
    };
  }
  return {
    currentGold: Math.max(0, Math.floor(saved.currentGold)),
    totalEarnedThisRun: Math.max(0, Math.floor(saved.totalEarnedThisRun ?? saved.currentGold)),
    totalSpentThisRun: Math.max(0, Math.floor(saved.totalSpentThisRun ?? 0)),
    earnedBySource: { ...(saved.earnedBySource ?? {}) },
    spentBySink: { ...(saved.spentBySink ?? {}) },
    shopPurchaseCountThisRun: Math.max(0, Math.floor(saved.shopPurchaseCountThisRun ?? 0)),
    ballRemoveCountThisRun: Math.max(0, Math.floor(saved.ballRemoveCountThisRun ?? 0)),
    curseCleanseCountThisRun: Math.max(0, Math.floor(saved.curseCleanseCountThisRun ?? 0)),
    shopRerollCountThisRun: Math.max(0, Math.floor(saved.shopRerollCountThisRun ?? 0)),
    committedBattleRewardIds: [...new Set(saved.committedBattleRewardIds ?? [])],
    processedTransactionIds: [...new Set(saved.processedTransactionIds ?? [])],
    runEnded: Boolean(saved.runEnded),
  };
}

export function applyGoldTransaction(state: RunGoldState, request: GoldTransactionRequest): GoldTransactionResult {
  if (state.processedTransactionIds.includes(request.transactionId)) return { state, applied: false };
  if (state.runEnded) return { state, applied: false, error: "RUN_ENDED" };
  if (!request.transactionId || !Number.isInteger(request.amount) || request.amount === 0) {
    return { state, applied: false, error: "INVALID_TRANSACTION" };
  }
  if ((request.amount > 0 && !request.source) || (request.amount < 0 && !request.sink)) {
    return { state, applied: false, error: "INVALID_TRANSACTION" };
  }
  if (request.amount < 0 && state.currentGold < Math.abs(request.amount)) {
    return { state, applied: false, error: "INSUFFICIENT_GOLD" };
  }

  const next = cloneGoldState(state);
  next.currentGold += request.amount;
  next.processedTransactionIds.push(request.transactionId);
  if (request.amount > 0 && request.source) {
    next.totalEarnedThisRun += request.amount;
    addRecordValue(next.earnedBySource, request.source, request.amount);
  } else if (request.amount < 0 && request.sink) {
    const spent = Math.abs(request.amount);
    next.totalSpentThisRun += spent;
    addRecordValue(next.spentBySink, request.sink, spent);
    if (["BUY_BALL", "REMOVE_BALL", "TRANSFORM_BALL", "BUY_RELIC", "HEAL", "BUY_SHIELD", "BUY_SHOTS", "CLEANSE_CURSE"].includes(request.sink)) next.shopPurchaseCountThisRun += 1;
    if (request.sink === "REMOVE_BALL") next.ballRemoveCountThisRun += 1;
    if (request.sink === "CLEANSE_CURSE") next.curseCleanseCountThisRun += 1;
    if (request.sink === "SHOP_REROLL") next.shopRerollCountThisRun += 1;
  }
  return { state: next, applied: true };
}

function normalizeNodeType(nodeType: BattleNodeType): "NORMAL" | "ELITE" | "BOSS" {
  if (nodeType === "ELITE" || nodeType === "ELITE_BATTLE") return "ELITE";
  if (nodeType === "BOSS" || nodeType === "BOSS_BATTLE") return "BOSS";
  return "NORMAL";
}

export function getCreditedCoinBubbleCount(nodeType: BattleNodeType, count: number, bossCountsByPhase: number[] = []) {
  const normalized = normalizeNodeType(nodeType);
  if (normalized === "BOSS") {
    if (bossCountsByPhase.length) {
      return Math.min(goldEconomyConfig.coinBubbleCaps.BOSS_TOTAL, bossCountsByPhase.reduce((sum, phaseCount) => sum + Math.min(goldEconomyConfig.coinBubbleCaps.BOSS_PHASE, Math.max(0, Math.floor(phaseCount))), 0));
    }
    return Math.min(goldEconomyConfig.coinBubbleCaps.BOSS_TOTAL, Math.max(0, Math.floor(count)));
  }
  return Math.min(goldEconomyConfig.coinBubbleCaps[normalized], Math.max(0, Math.floor(count)));
}

export type CoinBubbleClearCause = "DIRECT_MATCH" | "PLAYER_SPECIAL_CLEAR" | "PLAYER_CREATED_DETACH" | "PRESSURE_OVERFLOW" | "SECONDARY_DROP" | "SYSTEM_CLEAR" | "REFILL" | "ENEMY_EFFECT";

export function isLegalCoinBubbleClear(cause: CoinBubbleClearCause) {
  return cause === "DIRECT_MATCH" || cause === "PLAYER_SPECIAL_CLEAR" || cause === "PLAYER_CREATED_DETACH";
}

export function calculateBattleGold(input: BattleGoldInput): BattleGoldBreakdown {
  const nodeType = normalizeNodeType(input.nodeType);
  const configured = goldEconomyConfig.battleRewards[input.levelId] ?? { baseGold: 0, fixedEncounterBonus: 0 };
  const coinBubbleCount = getCreditedCoinBubbleCount(input.nodeType, input.coinBubbleCount ?? 0, input.bossCoinBubbleCountsByPhase);
  const coinBubbleGold = coinBubbleCount * goldEconomyConfig.coinBubbleValue;
  let rawPerformanceGold = 0;
  if (input.noPressureOverflow) rawPerformanceGold += goldEconomyConfig.performance.noPressureOverflow;
  if (input.noHpDamage) rawPerformanceGold += goldEconomyConfig.performance.noHpDamage;
  if ((input.remainingShotRatio ?? 0) >= .25) rawPerformanceGold += goldEconomyConfig.performance.remainingShotsAtLeast25Percent;
  if ((input.playerBoardClearCount ?? 0) > 0) rawPerformanceGold += goldEconomyConfig.performance.playerBoardClear;
  const performanceGold = Math.min(goldEconomyConfig.performance.caps[nodeType], rawPerformanceGold);
  const extraEncounterBonus = Math.max(0, Math.floor(input.extraEncounterBonus ?? 0));
  const beforeRoute = configured.baseGold + coinBubbleGold + performanceGold + configured.fixedEncounterBonus + extraEncounterBonus;
  const routeMultiplier = Math.max(0, Math.min(goldEconomyConfig.maximumRouteMultiplier, input.routeGoldMultiplier ?? 1));
  const afterRoute = Math.round(beforeRoute * routeMultiplier);
  const routeModifierGold = afterRoute - beforeRoute;
  const relicGold = Math.max(0, Math.floor(input.relicGold ?? 0));
  const sourceBreakdown: Partial<Record<GoldSourceType, number>> = {
    BATTLE_BASE: configured.baseGold,
    COIN_BUBBLE: coinBubbleGold,
    PERFORMANCE: performanceGold,
    ROUTE_MODIFIER: routeModifierGold,
    RELIC: relicGold,
  };
  if (nodeType === "ELITE") sourceBreakdown.ELITE_BONUS = configured.fixedEncounterBonus + extraEncounterBonus;
  else if (nodeType === "BOSS") sourceBreakdown.BOSS_BONUS = configured.fixedEncounterBonus + extraEncounterBonus;
  else sourceBreakdown.BATTLE_BASE = configured.baseGold + configured.fixedEncounterBonus + extraEncounterBonus;
  return {
    battleRewardId: input.battleRewardId,
    levelId: input.levelId,
    nodeType,
    baseGold: configured.baseGold,
    coinBubbleCount,
    coinBubbleGold,
    performanceGold,
    fixedEncounterBonus: configured.fixedEncounterBonus,
    extraEncounterBonus,
    routeMultiplier,
    routeModifierGold,
    relicGold,
    totalGold: afterRoute + relicGold,
    sourceBreakdown,
  };
}

export function commitBattleGold(state: RunGoldState, breakdown: BattleGoldBreakdown): GoldTransactionResult {
  if (state.committedBattleRewardIds.includes(breakdown.battleRewardId) || state.processedTransactionIds.includes(breakdown.battleRewardId)) return { state, applied: false };
  if (state.runEnded) return { state, applied: false, error: "RUN_ENDED" };
  const next = cloneGoldState(state);
  next.currentGold += breakdown.totalGold;
  next.totalEarnedThisRun += breakdown.totalGold;
  Object.entries(breakdown.sourceBreakdown).forEach(([source, amount]) => {
    if (amount) addRecordValue(next.earnedBySource, source as GoldSourceType, amount);
  });
  next.committedBattleRewardIds.push(breakdown.battleRewardId);
  next.processedTransactionIds.push(breakdown.battleRewardId);
  return { state: next, applied: true };
}

export type EconomyShopOfferId =
  | "SHOP_NORMAL_PAIR"
  | "SHOP_BOMB"
  | "SHOP_FIRE"
  | "SHOP_RAINBOW"
  | "SHOP_TRANSFORM"
  | "SHOP_REMOVE"
  | "SHOP_RELIC"
  | "SHOP_HEAL"
  | "SHOP_SHIELD"
  | "SHOP_SHOTS"
  | "SHOP_CLEANSE"
  | "SHOP_LEAVE_GRANT_3";

export function getRemoveBallPrice(removeCountThisRun: number) {
  return Math.min(80, 32 + Math.max(0, Math.floor(removeCountThisRun)) * 16);
}

export function getCurseCleansePrice(cleanseCountThisRun: number) {
  return Math.min(56, 26 + Math.max(0, Math.floor(cleanseCountThisRun)) * 10);
}

export function getChapterPriceMultiplier(chapter: number) {
  if (chapter >= 3) return 1.45;
  if (chapter === 2) return 1.2;
  return 1;
}

export function getShopRerollPrice(rerollCountInShop: number, chapter = 1) {
  const basePrice = [8, 14, 20][Math.max(0, Math.floor(rerollCountInShop))];
  return basePrice === undefined ? undefined : Math.round(basePrice * getChapterPriceMultiplier(chapter));
}

export function getChapterShopPrice(
  offerId: string,
  counters: Pick<RunGoldState, "ballRemoveCountThisRun" | "curseCleanseCountThisRun"> = { ballRemoveCountThisRun: 0, curseCleanseCountThisRun: 0 },
  chapter = 1,
) {
  const fixedPrices: Record<string, number> = {
    SHOP_NORMAL_PAIR: 12,
    SHOP_BOMB: 22,
    SHOP_FIRE: 22,
    SHOP_RAINBOW: 32,
    SHOP_TRANSFORM: 28,
    SHOP_RELIC: 45,
    SHOP_HEAL: 18,
    SHOP_SHIELD: 12,
    SHOP_SHOTS: 20,
    SHOP_LEAVE_GRANT_3: 0,
  };
  const basePrice = offerId === "SHOP_REMOVE"
    ? getRemoveBallPrice(counters.ballRemoveCountThisRun)
    : offerId === "SHOP_CLEANSE"
      ? getCurseCleansePrice(counters.curseCleanseCountThisRun)
      : fixedPrices[offerId] ?? 0;
  return Math.round(basePrice * getChapterPriceMultiplier(chapter));
}

export function getShopSinkType(offerId: string): GoldSinkType | undefined {
  if (["SHOP_NORMAL_PAIR", "SHOP_BOMB", "SHOP_FIRE", "SHOP_RAINBOW"].includes(offerId)) return "BUY_BALL";
  if (offerId === "SHOP_REMOVE") return "REMOVE_BALL";
  if (offerId === "SHOP_TRANSFORM") return "TRANSFORM_BALL";
  if (offerId === "SHOP_RELIC") return "BUY_RELIC";
  if (offerId === "SHOP_HEAL") return "HEAL";
  if (offerId === "SHOP_SHIELD") return "BUY_SHIELD";
  if (offerId === "SHOP_SHOTS") return "BUY_SHOTS";
  if (offerId === "SHOP_CLEANSE") return "CLEANSE_CURSE";
  return undefined;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickSeeded<T>(items: readonly T[], seed: string) {
  return items[hashSeed(seed) % items.length];
}

export function buildEconomyShopInventory(input: {
  routeId: string;
  seed: number;
  currentGold: number;
  rerollCount?: number;
  bossShop?: boolean;
  counters?: Pick<RunGoldState, "ballRemoveCountThisRun" | "curseCleanseCountThisRun">;
  chapter?: number;
}) {
  const rerollCount = Math.max(0, Math.floor(input.rerollCount ?? 0));
  const salt = `${input.routeId}-${input.seed}-reroll-${rerollCount}-${input.bossShop ? "boss" : "normal"}`;
  const ballSlot = pickSeeded(["SHOP_NORMAL_PAIR", "SHOP_FIRE", "SHOP_RAINBOW"] as const, `${salt}-ball`);
  const buildSlot = pickSeeded(input.bossShop
    ? (["SHOP_RELIC", "SHOP_REMOVE", "SHOP_TRANSFORM", "SHOP_RAINBOW"] as const)
    : (["SHOP_RELIC", "SHOP_REMOVE", "SHOP_TRANSFORM"] as const), `${salt}-build`);
  const survivalSlot = pickSeeded(["SHOP_HEAL", "SHOP_SHIELD", "SHOP_SHOTS", "SHOP_CLEANSE"] as const, `${salt}-survival`);
  const offers: string[] = [ballSlot, buildSlot, survivalSlot];
  const minimumBallPrice = getChapterShopPrice("SHOP_NORMAL_PAIR", input.counters, input.chapter);
  if (input.currentGold < minimumBallPrice) offers[2] = "SHOP_LEAVE_GRANT_3";
  else if (!offers.some((offerId) => getChapterShopPrice(offerId, input.counters, input.chapter) <= input.currentGold)) offers[0] = "SHOP_NORMAL_PAIR";
  return offers;
}

export function convertRunGold(state: RunGoldState, result: "FAILED" | "VICTORY", transactionId: string) {
  if (state.runEnded || state.processedTransactionIds.includes(transactionId)) return { state, convertedMetaCurrency: 0, applied: false };
  const rule = goldEconomyConfig.conversion[result];
  const convertedMetaCurrency = Math.min(rule.cap, Math.floor(state.currentGold / rule.divisor));
  const next = cloneGoldState(state);
  next.currentGold = 0;
  next.runEnded = true;
  next.processedTransactionIds.push(transactionId);
  return { state: next, convertedMetaCurrency, applied: true };
}
