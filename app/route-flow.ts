import {
  buildEconomyShopInventory,
  getChapterShopPrice,
  getShopRerollPrice,
  type RunGoldState,
} from "./gold-economy.ts";

export type RouteArchetype =
  | "SAFE"
  | "RESOURCE"
  | "BUILD"
  | "RISK_REWARD"
  | "CONTROL"
  | "STORY"
  | "ELITE_VARIANT"
  | "BOSS_PREP";

export type RouteNodeType = "NORMAL" | "ELITE" | "BOSS";
export type RouteNodeKind = "COMBAT_PACKAGE" | "STANDALONE_SERVICE";
export type RouteServiceType =
  | "NONE"
  | "SHOP"
  | "REST"
  | "EVENT"
  | "WORKSHOP"
  | "SCOUT"
  | "TREASURE"
  | "MICRO_BUBBLE_CHALLENGE";
export type EffectLifetime = "IMMEDIATE" | "NEXT_BATTLE" | "NEXT_N_BATTLES" | "CURRENT_CHAPTER" | "CURRENT_RUN";

export type RouteEffect = {
  effectType:
    | "HEAL_PLAYER"
    | "HEAL_PLAYER_PERCENT"
    | "DAMAGE_PLAYER"
    | "GRANT_GOLD"
    | "GRANT_SHIELD"
    | "ADD_BALL"
    | "REMOVE_NORMAL_BALL"
    | "REMOVE_CURSE_BALL"
    | "TRANSFORM_BALL"
    | "ADD_RELIC"
    | "GRANT_BATTLE_SHOTS";
  value?: number;
  ballId?: string;
  fromBallId?: string;
  toBallId?: string;
  relicId?: string;
  lifetime?: EffectLifetime;
  battles?: number;
};

export type PendingRouteEffect = RouteEffect & {
  pendingEffectId: string;
  lifetime: Exclude<EffectLifetime, "IMMEDIATE">;
  remainingBattles?: number;
};

export type EncounterModifier = {
  type:
    | "ENEMY_HP_MULTIPLIER"
    | "SPAWN_POISON_BUBBLES"
    | "SPAWN_STONE_BUBBLES"
    | "SPAWN_WEB_BUBBLES"
    | "SPAWN_RAINBOW_BUBBLE"
    | "START_PRESSURE";
  value: number;
};

export interface RouteCardDefinition {
  routeId: string;
  name: string;
  description: string;
  nodeKind: RouteNodeKind;
  advancesBattleSlot: boolean;
  estimatedDurationSec: number;
  serviceDurationSec: number;
  primaryArchetype: RouteArchetype;
  nodeType: RouteNodeType;
  sceneArtId: string;
  enemyPoolId: string;
  boardTemplatePoolId: string;
  difficultyRating: 1 | 2 | 3 | 4 | 5;
  riskTags: string[];
  rewardTags: string[];
  mechanicTags: string[];
  preBattleEffects: RouteEffect[];
  encounterModifiers: EncounterModifier[];
  postBattleModifiers: RouteEffect[];
  rewardPoolId: string;
  rewardRarityBonus: number;
  goldMultiplier: number;
  serviceType: RouteServiceType;
  serviceConfigId?: string;
  fixedEnemyId?: string;
  uiSummary: {
    riskText: string;
    rewardText: string;
    badgeText?: string;
  };
}

export interface RouteGenerationRequest {
  runId: string;
  seed: number;
  chapterId: string;
  completedSlotIndex: number;
  nextSlotIndex: number;
  nextNodeType: RouteNodeType;
  playerHpPercent: number;
  gold: number;
  ballBagSummary: { size: number; specialCount: number; tags: string[] };
  relicTags: string[];
  recentEnemyFamilies: string[];
  recentRouteArchetypes: RouteArchetype[];
  recentTemplateFamilyIds: string[];
  fixedBossId?: string;
  nonCombatState?: Pick<RouteFlowState,
    | "standaloneNodeCountThisChapter"
    | "standaloneShopUsed"
    | "standaloneRestUsed"
    | "previousNodeWasStandalone"
  >;
}

export interface RouteGenerationResult {
  generationId: string;
  seed: number;
  nextSlotIndex: number;
  options: RouteCardDefinition[];
  fallbackUsed: boolean;
  validationWarnings: string[];
}

export interface RouteHistoryEntry {
  slotIndex: number;
  routeId: string;
  generationId?: string;
  nodeKind: RouteNodeKind;
  serviceType: RouteServiceType;
  battleSlotIndexBefore: number;
  battleSlotIndexAfter: number;
  primaryArchetype: RouteArchetype;
  enemyId: string;
  templateId: string;
  selectedAt: number;
  completedAt: number;
}

export type MicroChallengeState = {
  challengeId: string;
  shotBudget: number;
  shotsRemaining: number;
  score: number;
  targetIds: string[];
  hitTargetIds: string[];
};

export type RouteServiceSession = {
  sessionId: string;
  routeId: string;
  serviceType: RouteServiceType;
  seed: number;
  offerIds: string[];
  offerPrices: Record<string, number>;
  purchasedOfferIds: string[];
  rerollCount: number;
  choicesMade: number;
  maxChoices: number;
  completed: boolean;
  finalized: boolean;
  selectedEventOptionId?: string;
  challenge?: MicroChallengeState;
};

export interface RouteFlowState {
  currentSlotIndex: number;
  selectedRouteId?: string;
  pendingRouteGenerationId?: string;
  pendingRouteSeed?: number;
  pendingRouteOptions: string[];
  recentRouteArchetypes: RouteArchetype[];
  recentEnemyFamilies: string[];
  recentTemplateFamilyIds: string[];
  routeRefreshUsedThisChapter: number;
  routeHistory: RouteHistoryEntry[];
  standaloneNodeCountThisChapter: number;
  standaloneShopUsed: boolean;
  standaloneRestUsed: boolean;
  previousNodeWasStandalone: boolean;
  recentServiceTypes: RouteServiceType[];
  pendingService?: RouteServiceSession;
  pendingEffects: PendingRouteEffect[];
}

export type RouteEncounterBuild = {
  routeId: string;
  templateOrder: number;
  enemyHpMultiplier: number;
  poisonBubbles: number;
  stoneBubbles: number;
  webBubbles: number;
  rainbowBubbles: number;
  startingPressure: number;
  goldMultiplier: number;
  rewardRarityBonus: number;
  fixedEnemyId?: string;
};

export type RouteServiceContext = {
  currentHp: number;
  maxHp: number;
  shield: number;
  shieldMax: number;
  gold: number;
  ballBag: string[];
  relics?: string[];
  pendingEffects?: PendingRouteEffect[];
  preBattleBonusShots?: number;
};

export type RouteServiceOffer = {
  offerId: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  effects: RouteEffect[];
};

type RouteCardInput = Omit<RouteCardDefinition, "nodeKind" | "advancesBattleSlot" | "estimatedDurationSec" | "serviceDurationSec">;

function toCombatRoute(route: RouteCardInput): RouteCardDefinition {
  const serviceDurationSec = route.serviceType === "NONE" ? 0 : route.serviceType === "SHOP" ? 24 : 18;
  return {
    ...route,
    nodeKind: "COMBAT_PACKAGE",
    advancesBattleSlot: true,
    estimatedDurationSec: 60 + serviceDurationSec,
    serviceDurationSec,
  };
}

const normalRoutes = ([
  {
    routeId: "ROUTE_SAFE_STREAM", name: "溪谷小径", description: "沿溪谷进入低障碍战场，先恢复少量生命。",
    primaryArchetype: "SAFE", nodeType: "NORMAL", sceneArtId: "SCENE_STREAM", enemyPoolId: "FOREST",
    boardTemplatePoolId: "LOW_DENSITY", difficultyRating: 1, riskTags: ["LOW_OBSTACLE"], rewardTags: ["NORMAL_REWARD"], mechanicTags: ["DROP_FRIENDLY"],
    preBattleEffects: [{ effectType: "HEAL_PLAYER", value: 5 }], encounterModifiers: [{ type: "ENEMY_HP_MULTIPLIER", value: .95 }], postBattleModifiers: [],
    rewardPoolId: "REWARD_NORMAL", rewardRarityBonus: 0, goldMultiplier: 1, serviceType: "NONE",
    uiSummary: { riskText: "低障碍，敌人生命 -5%", rewardText: "战前恢复 5 HP", badgeText: "稳健" },
  },
  {
    routeId: "ROUTE_SAFE_CRYSTAL", name: "水晶回廊", description: "选择结构清晰的棋盘，避开密集障碍。",
    primaryArchetype: "SAFE", nodeType: "NORMAL", sceneArtId: "SCENE_CRYSTAL", enemyPoolId: "ICE",
    boardTemplatePoolId: "LOW_DENSITY", difficultyRating: 1, riskTags: ["LOW_DENSITY"], rewardTags: ["SHIELD"], mechanicTags: ["CLEAR_LINES"],
    preBattleEffects: [{ effectType: "GRANT_SHIELD", value: 4 }], encounterModifiers: [{ type: "ENEMY_HP_MULTIPLIER", value: .95 }], postBattleModifiers: [],
    rewardPoolId: "REWARD_NORMAL", rewardRarityBonus: 0, goldMultiplier: 1, serviceType: "NONE",
    uiSummary: { riskText: "低密度，路线清晰", rewardText: "开战获得 4 护盾", badgeText: "稳健" },
  },
  {
    routeId: "ROUTE_TRADE_CARAVAN", name: "流动商队", description: "先访问精简商店，再迎战强化敌人。",
    primaryArchetype: "RESOURCE", nodeType: "NORMAL", sceneArtId: "SCENE_CARAVAN", enemyPoolId: "SLIME",
    boardTemplatePoolId: "STANDARD", difficultyRating: 2, riskTags: ["ENEMY_HP_UP"], rewardTags: ["GOLD_UP", "SHOP"], mechanicTags: ["STANDARD"],
    preBattleEffects: [], encounterModifiers: [{ type: "ENEMY_HP_MULTIPLIER", value: 1.05 }], postBattleModifiers: [],
    rewardPoolId: "REWARD_RESOURCE", rewardRarityBonus: 0, goldMultiplier: 1.2, serviceType: "SHOP", serviceConfigId: "SHOP_ROUTE_SMALL",
    uiSummary: { riskText: "敌人生命 +5%", rewardText: "金币 +20%，开放商店", badgeText: "资源" },
  },
  {
    routeId: "ROUTE_BALL_WORKSHOP", name: "泡泡工坊", description: "精简球包并进入适合构筑验证的标准棋盘。",
    primaryArchetype: "BUILD", nodeType: "NORMAL", sceneArtId: "SCENE_WORKSHOP", enemyPoolId: "STONE",
    boardTemplatePoolId: "STANDARD", difficultyRating: 2, riskTags: ["STONE_LIGHT"], rewardTags: ["BUILD_REWARD"], mechanicTags: ["REMOVE_BALL"],
    preBattleEffects: [], encounterModifiers: [{ type: "SPAWN_STONE_BUBBLES", value: 1 }], postBattleModifiers: [],
    rewardPoolId: "REWARD_BUILD", rewardRarityBonus: .05, goldMultiplier: 1, serviceType: "WORKSHOP", serviceConfigId: "WORKSHOP_ROUTE_SMALL",
    uiSummary: { riskText: "额外 1 个石头障碍", rewardText: "战前移除 1 颗普通球", badgeText: "构筑" },
  },
  {
    routeId: "ROUTE_PRISM_GROVE", name: "棱镜林地", description: "彩虹泡泡改善开局，但敌人略有强化。",
    primaryArchetype: "BUILD", nodeType: "NORMAL", sceneArtId: "SCENE_PRISM", enemyPoolId: "GHOST",
    boardTemplatePoolId: "CHAIN_FRIENDLY", difficultyRating: 2, riskTags: ["ENEMY_HP_UP"], rewardTags: ["SPECIAL_BALL"], mechanicTags: ["RAINBOW"],
    preBattleEffects: [], encounterModifiers: [{ type: "ENEMY_HP_MULTIPLIER", value: 1.05 }, { type: "SPAWN_RAINBOW_BUBBLE", value: 1 }], postBattleModifiers: [],
    rewardPoolId: "REWARD_BUILD", rewardRarityBonus: .05, goldMultiplier: 1, serviceType: "NONE",
    uiSummary: { riskText: "敌人生命 +5%", rewardText: "棋盘加入彩虹泡泡", badgeText: "构筑" },
  },
  {
    routeId: "ROUTE_POISON_MARSH", name: "毒雾沼泽", description: "毒液覆盖提高战场压力，换取更好的奖励。",
    primaryArchetype: "RISK_REWARD", nodeType: "NORMAL", sceneArtId: "SCENE_MARSH", enemyPoolId: "POISON",
    boardTemplatePoolId: "MID_DENSITY", difficultyRating: 3, riskTags: ["POISON_OVERLAY", "ENEMY_HP_UP"], rewardTags: ["RARITY_UP"], mechanicTags: ["POISON"],
    preBattleEffects: [], encounterModifiers: [{ type: "ENEMY_HP_MULTIPLIER", value: 1.1 }, { type: "SPAWN_POISON_BUBBLES", value: 2 }], postBattleModifiers: [],
    rewardPoolId: "REWARD_RISK", rewardRarityBonus: .2, goldMultiplier: 1, serviceType: "NONE",
    uiSummary: { riskText: "毒液 +2，敌人生命 +10%", rewardText: "奖励稀有率 +20%", badgeText: "高风险" },
  },
  {
    routeId: "ROUTE_STONE_VAULT", name: "石甲回廊", description: "密集石头阻挡支撑点，金币收益显著提高。",
    primaryArchetype: "RISK_REWARD", nodeType: "NORMAL", sceneArtId: "SCENE_VAULT", enemyPoolId: "STONE",
    boardTemplatePoolId: "OBSTACLE_MEDIUM", difficultyRating: 3, riskTags: ["STONE_OVERLAY", "ENEMY_HP_UP"], rewardTags: ["GOLD_UP"], mechanicTags: ["STONE"],
    preBattleEffects: [], encounterModifiers: [{ type: "ENEMY_HP_MULTIPLIER", value: 1.12 }, { type: "SPAWN_STONE_BUBBLES", value: 3 }], postBattleModifiers: [],
    rewardPoolId: "REWARD_RISK", rewardRarityBonus: .1, goldMultiplier: 1.25, serviceType: "NONE",
    uiSummary: { riskText: "石头 +3，敌人生命 +12%", rewardText: "金币 +25%", badgeText: "高风险" },
  },
  {
    routeId: "ROUTE_MYSTERY_ALTAR", name: "神秘祭坛", description: "完成一次二选一风险交易，再进入下一场普通战。",
    primaryArchetype: "RESOURCE", nodeType: "NORMAL", sceneArtId: "SCENE_ALTAR", enemyPoolId: "GHOST",
    boardTemplatePoolId: "STANDARD", difficultyRating: 2, riskTags: ["EVENT_COST"], rewardTags: ["EVENT", "BUILD_REWARD"], mechanicTags: ["ALTAR"],
    preBattleEffects: [], encounterModifiers: [], postBattleModifiers: [], rewardPoolId: "REWARD_BUILD",
    rewardRarityBonus: .05, goldMultiplier: 1, serviceType: "EVENT", serviceConfigId: "EVENT_ALTAR_TWO_CHOICE",
    uiSummary: { riskText: "二选一风险交易", rewardText: "遗物或特殊球", badgeText: "事件" },
  },
  {
    routeId: "ROUTE_MARBLE_TRIAL", name: "弹珠试炼", description: "使用独立的 3 发预算命中目标，奖励不会消耗正式战斗发射次数。",
    primaryArchetype: "BUILD", nodeType: "NORMAL", sceneArtId: "SCENE_TRIAL", enemyPoolId: "SLIME",
    boardTemplatePoolId: "CHAIN_FRIENDLY", difficultyRating: 2, riskTags: ["MICRO_CHALLENGE"], rewardTags: ["GOLD_UP", "SPECIAL_BALL"], mechanicTags: ["PRECISION", "MICRO"],
    preBattleEffects: [], encounterModifiers: [], postBattleModifiers: [], rewardPoolId: "REWARD_BUILD",
    rewardRarityBonus: .05, goldMultiplier: 1, serviceType: "MICRO_BUBBLE_CHALLENGE", serviceConfigId: "MICRO_TRIAL_THREE_SHOTS",
    uiSummary: { riskText: "独立 3 发精准试炼", rewardText: "金币，满分得彩虹球", badgeText: "试炼" },
  },
] as RouteCardInput[]).map(toCombatRoute);

const eliteRoutes = ([
  {
    routeId: "ROUTE_ELITE_STONE", name: "石甲巨像", description: "挑战重甲精英，寻找爆破类遗物。",
    primaryArchetype: "ELITE_VARIANT", nodeType: "ELITE", sceneArtId: "SCENE_ELITE_STONE", enemyPoolId: "ELITE_STONE",
    boardTemplatePoolId: "OBSTACLE_MEDIUM", difficultyRating: 4, riskTags: ["STONE_HEAVY"], rewardTags: ["ELITE_RELIC", "BOMB"], mechanicTags: ["STONE", "SHIELD"],
    preBattleEffects: [], encounterModifiers: [{ type: "SPAWN_STONE_BUBBLES", value: 3 }], postBattleModifiers: [], rewardPoolId: "REWARD_ELITE_BLAST",
    rewardRarityBonus: .15, goldMultiplier: 1.1, serviceType: "NONE", uiSummary: { riskText: "重甲与石头障碍", rewardText: "爆破类精英奖励", badgeText: "精英" },
  },
  {
    routeId: "ROUTE_ELITE_POISON", name: "毒液领主", description: "挑战持续污染精英，奖励偏向净化与生存。",
    primaryArchetype: "ELITE_VARIANT", nodeType: "ELITE", sceneArtId: "SCENE_ELITE_POISON", enemyPoolId: "ELITE_POISON",
    boardTemplatePoolId: "MID_DENSITY", difficultyRating: 4, riskTags: ["POISON_HEAVY"], rewardTags: ["ELITE_RELIC", "SURVIVAL"], mechanicTags: ["POISON"],
    preBattleEffects: [], encounterModifiers: [{ type: "SPAWN_POISON_BUBBLES", value: 3 }], postBattleModifiers: [], rewardPoolId: "REWARD_ELITE_CLEANSE",
    rewardRarityBonus: .15, goldMultiplier: 1.1, serviceType: "NONE", uiSummary: { riskText: "毒液持续扩散", rewardText: "净化与生存类遗物", badgeText: "精英" },
  },
  {
    routeId: "ROUTE_ELITE_WEB", name: "蛛网守卫", description: "挑战限制掉落的蛛网精英，奖励偏向反制。",
    primaryArchetype: "ELITE_VARIANT", nodeType: "ELITE", sceneArtId: "SCENE_ELITE_WEB", enemyPoolId: "ELITE_WEB",
    boardTemplatePoolId: "CHAIN_FRIENDLY", difficultyRating: 4, riskTags: ["WEB_HEAVY"], rewardTags: ["ELITE_RELIC", "COUNTER"], mechanicTags: ["WEB"],
    preBattleEffects: [], encounterModifiers: [{ type: "SPAWN_WEB_BUBBLES", value: 3 }], postBattleModifiers: [], rewardPoolId: "REWARD_ELITE_COUNTER",
    rewardRarityBonus: .15, goldMultiplier: 1.1, serviceType: "NONE", uiSummary: { riskText: "蛛网限制掉落", rewardText: "反制类精英遗物", badgeText: "精英" },
  },
] as RouteCardInput[]).map(toCombatRoute);

const bossRoutes = ([
  {
    routeId: "ROUTE_BOSS_CAMP", name: "整备营地", description: "在决战前充分休息，不提高 Boss 强度。",
    primaryArchetype: "BOSS_PREP", nodeType: "BOSS", sceneArtId: "SCENE_CAMP", enemyPoolId: "BOSS_SPIDER_QUEEN",
    boardTemplatePoolId: "BOSS_FIXED", difficultyRating: 3, riskTags: ["BOSS_FIXED"], rewardTags: ["HEAL"], mechanicTags: ["BOSS_PREP"],
    preBattleEffects: [{ effectType: "HEAL_PLAYER", value: 20 }], encounterModifiers: [], postBattleModifiers: [], rewardPoolId: "REWARD_BOSS",
    rewardRarityBonus: 0, goldMultiplier: 1, serviceType: "NONE", fixedEnemyId: "BOSS_SPIDER_QUEEN",
    uiSummary: { riskText: "Boss 强度不变", rewardText: "恢复 20 HP", badgeText: "Boss 准备" },
  },
  {
    routeId: "ROUTE_BOSS_MERCHANT", name: "秘商补给", description: "进入 Boss 前商店，代价是 Boss 生命提高。",
    primaryArchetype: "BOSS_PREP", nodeType: "BOSS", sceneArtId: "SCENE_SECRET_SHOP", enemyPoolId: "BOSS_SPIDER_QUEEN",
    boardTemplatePoolId: "BOSS_FIXED", difficultyRating: 4, riskTags: ["BOSS_HP_UP"], rewardTags: ["SHOP"], mechanicTags: ["BOSS_PREP"],
    preBattleEffects: [], encounterModifiers: [{ type: "ENEMY_HP_MULTIPLIER", value: 1.05 }], postBattleModifiers: [], rewardPoolId: "REWARD_BOSS",
    rewardRarityBonus: 0, goldMultiplier: 1, serviceType: "SHOP", serviceConfigId: "SHOP_BOSS", fixedEnemyId: "BOSS_SPIDER_QUEEN",
    uiSummary: { riskText: "Boss 生命 +5%", rewardText: "开放 Boss 前商店", badgeText: "Boss 准备" },
  },
  {
    routeId: "ROUTE_BOSS_CURSED_CHEST", name: "诅咒宝箱", description: "获得稀有构筑机会，但 Boss 开局布置蛛网。",
    primaryArchetype: "BOSS_PREP", nodeType: "BOSS", sceneArtId: "SCENE_CURSED_CHEST", enemyPoolId: "BOSS_SPIDER_QUEEN",
    boardTemplatePoolId: "BOSS_FIXED", difficultyRating: 5, riskTags: ["WEB_OPENING"], rewardTags: ["RARITY_UP"], mechanicTags: ["BOSS_PREP", "WEB"],
    preBattleEffects: [], encounterModifiers: [{ type: "SPAWN_WEB_BUBBLES", value: 3 }], postBattleModifiers: [], rewardPoolId: "REWARD_BOSS_RARE",
    rewardRarityBonus: .2, goldMultiplier: 1, serviceType: "NONE", fixedEnemyId: "BOSS_SPIDER_QUEEN",
    uiSummary: { riskText: "Boss 开局额外 3 个蛛网", rewardText: "奖励稀有率 +20%", badgeText: "Boss 准备" },
  },
] as RouteCardInput[]).map(toCombatRoute);

const standaloneRoutes: RouteCardDefinition[] = [
  {
    routeId: "ROUTE_STANDALONE_CARAVAN", name: "路边商队", description: "短暂停留购买补给；完成后仍选择当前主战斗槽位。",
    nodeKind: "STANDALONE_SERVICE", advancesBattleSlot: false, estimatedDurationSec: 24, serviceDurationSec: 24,
    primaryArchetype: "RESOURCE", nodeType: "NORMAL", sceneArtId: "SCENE_CARAVAN", enemyPoolId: "NONE", boardTemplatePoolId: "NONE",
    difficultyRating: 1, riskTags: ["STANDALONE"], rewardTags: ["SHOP"], mechanicTags: ["SHORT_SERVICE"],
    preBattleEffects: [], encounterModifiers: [], postBattleModifiers: [], rewardPoolId: "SERVICE_ONLY", rewardRarityBonus: 0, goldMultiplier: 1,
    serviceType: "SHOP", serviceConfigId: "SHOP_STANDALONE_SMALL",
    uiSummary: { riskText: "不推进战斗槽位", rewardText: "3 件商品，最多购买 2 件", badgeText: "独立商店" },
  },
  {
    routeId: "ROUTE_STANDALONE_CAMP", name: "林间篝火", description: "在回复、删球和球包升级之间选择一项；完成后继续选择当前战斗路线。",
    nodeKind: "STANDALONE_SERVICE", advancesBattleSlot: false, estimatedDurationSec: 18, serviceDurationSec: 18,
    primaryArchetype: "SAFE", nodeType: "NORMAL", sceneArtId: "SCENE_CAMP", enemyPoolId: "NONE", boardTemplatePoolId: "NONE",
    difficultyRating: 1, riskTags: ["STANDALONE"], rewardTags: ["REST"], mechanicTags: ["ONE_CHOICE"],
    preBattleEffects: [], encounterModifiers: [], postBattleModifiers: [], rewardPoolId: "SERVICE_ONLY", rewardRarityBonus: 0, goldMultiplier: 1,
    serviceType: "REST", serviceConfigId: "REST_STANDALONE_CAMP",
    uiSummary: { riskText: "不推进战斗槽位", rewardText: "回复、删球或升级三选一", badgeText: "独立休息" },
  },
];

export const routeCatalog = [...normalRoutes, ...eliteRoutes, ...bossRoutes, ...standaloneRoutes];
const routeById = new Map(routeCatalog.map((route) => [route.routeId, route]));

export const routeServiceOfferCatalog: RouteServiceOffer[] = [
  { offerId: "SHOP_NORMAL_PAIR", name: "普通球补给", description: "加入红、蓝普通球各 1 颗", icon: "球", price: 12, effects: [{ effectType: "ADD_BALL", ballId: "red" }, { effectType: "ADD_BALL", ballId: "blue" }] },
  { offerId: "SHOP_BOMB", name: "炸弹球", description: "加入 1 颗炸弹球", icon: "爆", price: 22, effects: [{ effectType: "ADD_BALL", ballId: "bomb" }] },
  { offerId: "SHOP_FIRE", name: "火焰球", description: "加入 1 颗火焰球", icon: "火", price: 22, effects: [{ effectType: "ADD_BALL", ballId: "fire" }] },
  { offerId: "SHOP_RAINBOW", name: "彩虹球", description: "加入 1 颗彩虹球", icon: "虹", price: 32, effects: [{ effectType: "ADD_BALL", ballId: "rainbow" }] },
  { offerId: "SHOP_TRANSFORM", name: "火焰转换", description: "将 1 颗红球转换为火焰球", icon: "炼", price: 28, effects: [{ effectType: "TRANSFORM_BALL", fromBallId: "red", toBallId: "fire" }] },
  { offerId: "SHOP_HEAL", name: "生命药剂", description: "恢复 20% 最大生命（缺血至少 10）", icon: "心", price: 18, effects: [{ effectType: "HEAL_PLAYER_PERCENT", value: .2 }] },
  { offerId: "SHOP_REMOVE", name: "球包精简", description: "移除数量最多的普通球（每次涨价）", icon: "减", price: 32, effects: [{ effectType: "REMOVE_NORMAL_BALL" }] },
  { offerId: "SHOP_RELIC", name: "石壳护符", description: "获得石壳遗物；这是购买，不是怪物掉落", icon: "遗", price: 45, effects: [{ effectType: "ADD_RELIC", relicId: "RELIC_STONE_SHELL", lifetime: "CURRENT_RUN" }] },
  { offerId: "SHOP_SHIELD", name: "战前护盾", description: "下一战获得 10 护盾", icon: "盾", price: 12, effects: [{ effectType: "GRANT_SHIELD", value: 10, lifetime: "NEXT_BATTLE" }] },
  { offerId: "SHOP_SHOTS", name: "额外弹药", description: "下一战发射次数 +3", icon: "弹", price: 20, effects: [{ effectType: "GRANT_BATTLE_SHOTS", value: 3, lifetime: "NEXT_BATTLE" }] },
  { offerId: "SHOP_CLEANSE", name: "清除诅咒", description: "移除 1 颗蛛网诅咒球（每次涨价）", icon: "净", price: 26, effects: [{ effectType: "REMOVE_CURSE_BALL" }] },
  { offerId: "SHOP_LEAVE_GRANT_3", name: "旅商补助", description: "金币不足，离店并获得 3 金币", icon: "+", price: 0, effects: [{ effectType: "GRANT_GOLD", value: 3 }] },
  { offerId: "REST_HEAL", name: "安稳休息", description: "恢复 25% 最大生命", icon: "营", price: 0, effects: [{ effectType: "HEAL_PLAYER_PERCENT", value: .25 }] },
  { offerId: "REST_REMOVE", name: "整理球包", description: "移除 1 颗重复普通球", icon: "减", price: 0, effects: [{ effectType: "REMOVE_NORMAL_BALL" }] },
  { offerId: "REST_UPGRADE", name: "淬炼红球", description: "将 1 颗红球升级为火焰球", icon: "火", price: 0, effects: [{ effectType: "TRANSFORM_BALL", fromBallId: "red", toBallId: "fire" }] },
  { offerId: "WORKSHOP_REMOVE", name: "精简配色", description: "移除 1 颗重复普通球", icon: "减", price: 0, effects: [{ effectType: "REMOVE_NORMAL_BALL" }] },
  { offerId: "WORKSHOP_FIRE", name: "火焰调色", description: "红球转换为火焰球", icon: "火", price: 0, effects: [{ effectType: "TRANSFORM_BALL", fromBallId: "red", toBallId: "fire" }] },
  { offerId: "WORKSHOP_ICE", name: "冰霜调色", description: "蓝球转换为冰冻球", icon: "冰", price: 0, effects: [{ effectType: "TRANSFORM_BALL", fromBallId: "blue", toBallId: "ice" }] },
  { offerId: "WORKSHOP_RAINBOW", name: "棱镜调色", description: "随机普通球转换为彩虹球", icon: "虹", price: 0, effects: [{ effectType: "TRANSFORM_BALL", toBallId: "rainbow" }] },
  { offerId: "EVENT_BLOOD_RELIC", name: "鲜血献祭", description: "失去 10 HP，获得稀有遗物", icon: "祭", price: 0, effects: [{ effectType: "DAMAGE_PLAYER", value: 10 }, { effectType: "ADD_RELIC", relicId: "RELIC_LUCKY_BELL", lifetime: "CURRENT_RUN" }] },
  { offerId: "EVENT_CURSED_SHIELD", name: "蛛丝契约", description: "加入蛛网诅咒球；下一战获得 10 护盾", icon: "契", price: 0, effects: [{ effectType: "ADD_BALL", ballId: "curseWeb" }, { effectType: "GRANT_SHIELD", value: 10, lifetime: "NEXT_BATTLE" }] },
];
const serviceOfferById = new Map(routeServiceOfferCatalog.map((offer) => [offer.offerId, offer]));

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(value: string) {
  return hashString(value) / 4294967295;
}

function cloneRoute(route: RouteCardDefinition): RouteCardDefinition {
  return {
    ...route,
    riskTags: [...route.riskTags], rewardTags: [...route.rewardTags], mechanicTags: [...route.mechanicTags],
    preBattleEffects: route.preBattleEffects.map((effect) => ({ ...effect })),
    encounterModifiers: route.encounterModifiers.map((modifier) => ({ ...modifier })),
    postBattleModifiers: route.postBattleModifiers.map((effect) => ({ ...effect })),
    uiSummary: { ...route.uiSummary },
  };
}

export function getRouteById(routeId: string | undefined) {
  const route = routeId ? routeById.get(routeId) : undefined;
  return route ? cloneRoute(route) : undefined;
}

export function getRouteCardsByIds(routeIds: string[]) {
  return routeIds.map((routeId) => getRouteById(routeId)).filter((route): route is RouteCardDefinition => Boolean(route));
}

export function getSlotNodeType(slotIndex: number): RouteNodeType {
  if (slotIndex === 5) return "ELITE";
  if (slotIndex === 10) return "BOSS";
  return "NORMAL";
}

export function createRouteFlowState(): RouteFlowState {
  return {
    currentSlotIndex: 0,
    pendingRouteOptions: [],
    recentRouteArchetypes: [],
    recentEnemyFamilies: [],
    recentTemplateFamilyIds: [],
    routeRefreshUsedThisChapter: 0,
    routeHistory: [],
    standaloneNodeCountThisChapter: 0,
    standaloneShopUsed: false,
    standaloneRestUsed: false,
    previousNodeWasStandalone: false,
    recentServiceTypes: [],
    pendingEffects: [],
  };
}

export function getBuildAdaptedWeight(matchesBuild: boolean, requestedBonus = .1) {
  return 1 + (matchesBuild ? Math.min(.15, Math.max(0, requestedBonus)) : 0);
}

function pickRoute(candidates: RouteCardDefinition[], request: RouteGenerationRequest, salt: string) {
  const recentFamilies = new Set(request.recentEnemyFamilies.slice(-2));
  const preferred = candidates.filter((route) => !recentFamilies.has(route.enemyPoolId));
  const pool = preferred.length ? preferred : candidates;
  return [...pool].sort((a, b) => {
    const aBuildMatch = a.mechanicTags.some((tag) => request.ballBagSummary.tags.includes(tag));
    const bBuildMatch = b.mechanicTags.some((tag) => request.ballBagSummary.tags.includes(tag));
    const aScore = seededUnit(`${request.runId}-${request.seed}-${request.nextSlotIndex}-${salt}-${a.routeId}`) * getBuildAdaptedWeight(aBuildMatch);
    const bScore = seededUnit(`${request.runId}-${request.seed}-${request.nextSlotIndex}-${salt}-${b.routeId}`) * getBuildAdaptedWeight(bBuildMatch);
    return bScore - aScore || a.routeId.localeCompare(b.routeId);
  })[0];
}

export function validateRouteOptions(options: RouteCardDefinition[], nextNodeType: RouteNodeType) {
  const warnings: string[] = [];
  if (options.length !== 3) warnings.push("OPTION_COUNT_MUST_BE_THREE");
  if (options.some((route) => route.nodeType !== nextNodeType)) warnings.push("NODE_TYPE_MISMATCH");
  if (new Set(options.map((route) => route.routeId)).size !== options.length) warnings.push("DUPLICATE_ROUTE_ID");
  if (nextNodeType === "NORMAL") {
    if (!options.some((route) => route.primaryArchetype === "SAFE")) warnings.push("SAFE_OPTION_REQUIRED");
    if (!options.some((route) => route.primaryArchetype === "RESOURCE" || route.primaryArchetype === "BUILD")) warnings.push("BUILD_OR_RESOURCE_REQUIRED");
    if (!options.some((route) => route.primaryArchetype === "RISK_REWARD")) warnings.push("RISK_REWARD_REQUIRED");
    if (new Set(options.map((route) => route.primaryArchetype)).size !== options.length) warnings.push("NORMAL_ARCHETYPE_DUPLICATE");
    if (options.filter((route) => route.nodeKind === "STANDALONE_SERVICE").length > 1) warnings.push("STANDALONE_OPTION_LIMIT");
  }
  if (nextNodeType === "ELITE" && options.some((route) => route.primaryArchetype !== "ELITE_VARIANT" || !route.advancesBattleSlot)) warnings.push("ELITE_VARIANT_REQUIRED");
  if (nextNodeType === "BOSS" && options.some((route) => route.primaryArchetype !== "BOSS_PREP" || route.fixedEnemyId !== "BOSS_SPIDER_QUEEN" || !route.advancesBattleSlot)) warnings.push("FIXED_BOSS_REQUIRED");
  const longServiceCount = options.filter((route) => route.serviceDurationSec >= 15).length;
  if (longServiceCount > 1) warnings.push("LONG_SERVICE_OPTION_LIMIT");
  const rewardSignatures = new Set(options.map((route) => route.rewardTags.slice().sort().join("|")));
  if (rewardSignatures.size < 2) warnings.push("REWARD_VARIETY_REQUIRED");
  return warnings;
}

export function generateRouteOptions(request: RouteGenerationRequest): RouteGenerationResult {
  let options: RouteCardDefinition[];
  if (request.nextNodeType === "ELITE") {
    options = eliteRoutes.map(cloneRoute);
  } else if (request.nextNodeType === "BOSS") {
    options = bossRoutes.map((route) => ({ ...cloneRoute(route), fixedEnemyId: request.fixedBossId ?? route.fixedEnemyId }));
  } else {
    let safe = pickRoute(normalRoutes.filter((route) => route.primaryArchetype === "SAFE"), request, "safe");
    const middleCandidates = normalRoutes.filter((route) => route.primaryArchetype === "RESOURCE" || route.primaryArchetype === "BUILD");
    const recentTypes = new Set(request.recentRouteArchetypes.slice(-2));
    const freshMiddle = middleCandidates.filter((route) => !recentTypes.has(route.primaryArchetype));
    let middle = pickRoute(freshMiddle.length ? freshMiddle : middleCandidates, request, "middle");
    const risk = pickRoute(normalRoutes.filter((route) => route.primaryArchetype === "RISK_REWARD"), request, "risk");
    const nonCombat = request.nonCombatState;
    const standaloneAllowed = (nonCombat?.standaloneNodeCountThisChapter ?? 0) < 2 && !nonCombat?.previousNodeWasStandalone;
    if (standaloneAllowed && seededUnit(`${request.runId}-${request.seed}-${request.nextSlotIndex}-standalone`) < .2) {
      const eligibleStandalone = standaloneRoutes.filter((route) => {
        if (route.serviceType === "SHOP" && nonCombat?.standaloneShopUsed) return false;
        if (route.serviceType === "REST" && nonCombat?.standaloneRestUsed) return false;
        return true;
      });
      const standalone = pickRoute(eligibleStandalone, request, "standalone");
      if (standalone?.primaryArchetype === "SAFE") safe = standalone;
      else if (standalone) middle = standalone;
    }
    options = [safe, middle, risk].filter(Boolean).map(cloneRoute);
  }

  let validationWarnings = validateRouteOptions(options, request.nextNodeType);
  let fallbackUsed = false;
  if (validationWarnings.length) {
    fallbackUsed = true;
    options = (request.nextNodeType === "ELITE"
      ? eliteRoutes
      : request.nextNodeType === "BOSS"
        ? bossRoutes
        : [normalRoutes[0], normalRoutes[2], normalRoutes[5]])
      .map(cloneRoute);
    validationWarnings = validateRouteOptions(options, request.nextNodeType);
  }

  return {
    generationId: `ROUTE-${request.chapterId}-${request.nextSlotIndex}-${hashString(`${request.runId}-${request.seed}-${request.nextSlotIndex}`)}`,
    seed: request.seed,
    nextSlotIndex: request.nextSlotIndex,
    options,
    fallbackUsed,
    validationWarnings,
  };
}

const templatePools: Record<string, number[]> = {
  LOW_DENSITY: [1, 2, 7],
  STANDARD: [2, 6, 8],
  CHAIN_FRIENDLY: [2, 7, 9],
  MID_DENSITY: [3, 4, 9],
  OBSTACLE_MEDIUM: [4, 5, 9],
  BOSS_FIXED: [10],
};

export function buildRouteEncounter(route: RouteCardDefinition, seed: number, fallbackTemplateOrder: number): RouteEncounterBuild {
  const templates = templatePools[route.boardTemplatePoolId] ?? [fallbackTemplateOrder];
  const templateOrder = templates[hashString(`${route.routeId}-${seed}-${fallbackTemplateOrder}`) % templates.length] ?? fallbackTemplateOrder;
  const modifierValue = (type: EncounterModifier["type"], fallback: number) => route.encounterModifiers.find((modifier) => modifier.type === type)?.value ?? fallback;
  return {
    routeId: route.routeId,
    templateOrder,
    enemyHpMultiplier: modifierValue("ENEMY_HP_MULTIPLIER", 1),
    poisonBubbles: modifierValue("SPAWN_POISON_BUBBLES", 0),
    stoneBubbles: modifierValue("SPAWN_STONE_BUBBLES", 0),
    webBubbles: modifierValue("SPAWN_WEB_BUBBLES", 0),
    rainbowBubbles: modifierValue("SPAWN_RAINBOW_BUBBLE", 0),
    startingPressure: modifierValue("START_PRESSURE", 0),
    goldMultiplier: route.goldMultiplier,
    rewardRarityBonus: route.rewardRarityBonus,
    fixedEnemyId: route.fixedEnemyId,
  };
}

function cloneServiceContext(context: RouteServiceContext): RouteServiceContext {
  return {
    ...context,
    ballBag: [...context.ballBag],
    relics: [...(context.relics ?? [])],
    pendingEffects: (context.pendingEffects ?? []).map((effect) => ({ ...effect })),
  };
}

function getRemovableNormalBall(ballBag: string[]) {
  if (ballBag.length <= 10) return undefined;
  const counts = new Map<string, number>();
  ballBag.filter((ball) => ["red", "blue", "yellow", "green"].includes(ball)).forEach((ball) => counts.set(ball, (counts.get(ball) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

export function canApplyServiceOffer(offer: RouteServiceOffer, context: RouteServiceContext) {
  if (context.gold < offer.price) return false;
  return offer.effects.every((effect) => {
    if (effect.effectType === "HEAL_PLAYER" || effect.effectType === "HEAL_PLAYER_PERCENT") return offer.offerId === "SHOP_HEAL" ? context.maxHp - context.currentHp >= 10 : context.currentHp < context.maxHp;
    if (effect.effectType === "REMOVE_NORMAL_BALL") return Boolean(getRemovableNormalBall(context.ballBag));
    if (effect.effectType === "REMOVE_CURSE_BALL") return context.ballBag.includes("curseWeb");
    if (effect.effectType === "TRANSFORM_BALL") {
      return effect.fromBallId
        ? context.ballBag.includes(effect.fromBallId)
        : context.ballBag.some((ball) => ["red", "blue", "yellow", "green"].includes(ball));
    }
    if (effect.effectType === "DAMAGE_PLAYER") return context.currentHp > (effect.value ?? 0);
    if (effect.effectType === "ADD_RELIC") return !context.relics?.includes(effect.relicId ?? "");
    return true;
  });
}

function applyServiceEffect(context: RouteServiceContext, effect: RouteEffect, sourceId: string) {
  const next = cloneServiceContext(context);
  if (effect.lifetime === "NEXT_BATTLE" || effect.lifetime === "NEXT_N_BATTLES") {
    const pending: PendingRouteEffect = {
      ...effect,
      pendingEffectId: `${sourceId}-${next.pendingEffects?.length ?? 0}`,
      lifetime: effect.lifetime,
      remainingBattles: effect.lifetime === "NEXT_N_BATTLES" ? Math.max(1, effect.battles ?? 1) : undefined,
    };
    next.pendingEffects = [...(next.pendingEffects ?? []), pending];
    return { context: next };
  }

  let removedBall: string | undefined;
  let transformedBall: string | undefined;
  let acquiredRelic: string | undefined;
  const value = effect.value ?? 0;
  if (effect.effectType === "HEAL_PLAYER") next.currentHp = Math.min(next.maxHp, next.currentHp + value);
  else if (effect.effectType === "HEAL_PLAYER_PERCENT") next.currentHp = Math.min(next.maxHp, next.currentHp + Math.ceil(next.maxHp * value));
  else if (effect.effectType === "DAMAGE_PLAYER") next.currentHp = Math.max(1, next.currentHp - value);
  else if (effect.effectType === "GRANT_GOLD") next.gold += value;
  else if (effect.effectType === "GRANT_SHIELD") next.shield = Math.min(next.shieldMax, next.shield + value);
  else if (effect.effectType === "ADD_BALL" && effect.ballId) next.ballBag.push(effect.ballId);
  else if (effect.effectType === "REMOVE_NORMAL_BALL") {
    const target = getRemovableNormalBall(next.ballBag);
    if (target) {
      next.ballBag.splice(next.ballBag.lastIndexOf(target), 1);
      removedBall = target;
    }
  } else if (effect.effectType === "REMOVE_CURSE_BALL") {
    const targetIndex = next.ballBag.indexOf("curseWeb");
    if (targetIndex >= 0) {
      next.ballBag.splice(targetIndex, 1);
      removedBall = "curseWeb";
    }
  } else if (effect.effectType === "TRANSFORM_BALL" && effect.toBallId) {
    const targetIndex = effect.fromBallId
      ? next.ballBag.indexOf(effect.fromBallId)
      : next.ballBag.findIndex((ball) => ["red", "blue", "yellow", "green"].includes(ball));
    if (targetIndex >= 0) {
      transformedBall = next.ballBag[targetIndex];
      next.ballBag[targetIndex] = effect.toBallId;
    }
  } else if (effect.effectType === "ADD_RELIC" && effect.relicId && !next.relics?.includes(effect.relicId)) {
    next.relics = [...(next.relics ?? []), effect.relicId];
    acquiredRelic = effect.relicId;
  } else if (effect.effectType === "GRANT_BATTLE_SHOTS") {
    next.preBattleBonusShots = (next.preBattleBonusShots ?? 0) + value;
  }
  return { context: next, removedBall, transformedBall, acquiredRelic };
}

function applyEffects(context: RouteServiceContext, effects: RouteEffect[], sourceId: string) {
  let next = cloneServiceContext(context);
  let removedBall: string | undefined;
  let transformedBall: string | undefined;
  let acquiredRelic: string | undefined;
  effects.forEach((effect, index) => {
    const result = applyServiceEffect(next, effect, `${sourceId}-${index}`);
    next = result.context;
    removedBall = result.removedBall ?? removedBall;
    transformedBall = result.transformedBall ?? transformedBall;
    acquiredRelic = result.acquiredRelic ?? acquiredRelic;
  });
  return { context: next, removedBall, transformedBall, acquiredRelic };
}

type RouteServiceEconomyContext = {
  currentGold?: number;
  counters?: Pick<RunGoldState, "ballRemoveCountThisRun" | "curseCleanseCountThisRun">;
  chapter?: number;
};

function getSessionOfferPrices(offerIds: string[], counters?: RouteServiceEconomyContext["counters"], chapter = 1) {
  return Object.fromEntries(offerIds.map((offerId) => [offerId, getChapterShopPrice(offerId, counters, chapter)]));
}

export function createRouteServiceSession(route: RouteCardDefinition, seed: number, restored?: RouteServiceSession, economy: RouteServiceEconomyContext = {}): RouteServiceSession {
  if (restored?.routeId === route.routeId) return {
    ...restored,
    offerIds: [...restored.offerIds],
    offerPrices: { ...(restored.offerPrices ?? getSessionOfferPrices(restored.offerIds, economy.counters, economy.chapter)) },
    purchasedOfferIds: [...restored.purchasedOfferIds],
    rerollCount: restored.rerollCount ?? 0,
    challenge: restored.challenge ? { ...restored.challenge, targetIds: [...restored.challenge.targetIds], hitTargetIds: [...restored.challenge.hitTargetIds] } : undefined,
  };
  let offerIds: string[] = [];
  let maxChoices = 1;
  if (route.serviceType === "SHOP") {
    offerIds = buildEconomyShopInventory({
      routeId: route.routeId,
      seed,
      currentGold: economy.currentGold ?? 100,
      bossShop: route.serviceConfigId === "SHOP_BOSS",
      counters: economy.counters,
      chapter: economy.chapter,
    });
    maxChoices = 2;
  } else if (route.serviceType === "REST") offerIds = ["REST_HEAL", "REST_REMOVE", "REST_UPGRADE"];
  else if (route.serviceType === "WORKSHOP") offerIds = ["WORKSHOP_REMOVE", "WORKSHOP_FIRE", "WORKSHOP_ICE", "WORKSHOP_RAINBOW"];
  else if (route.serviceType === "EVENT") offerIds = ["EVENT_BLOOD_RELIC", "EVENT_CURSED_SHIELD"];

  const challenge = route.serviceType === "MICRO_BUBBLE_CHALLENGE" ? {
    challengeId: "MICRO_TRIAL_THREE_SHOTS",
    shotBudget: 3,
    shotsRemaining: 3,
    score: 0,
    targetIds: ["trial-red", "trial-blue", "trial-yellow", "trial-green", "trial-prism"],
    hitTargetIds: [],
  } : undefined;
  return {
    sessionId: `SERVICE-${route.routeId}-${seed}`,
    routeId: route.routeId,
    serviceType: route.serviceType,
    seed,
    offerIds,
    offerPrices: getSessionOfferPrices(offerIds, economy.counters, economy.chapter),
    purchasedOfferIds: [],
    rerollCount: 0,
    choicesMade: 0,
    maxChoices,
    completed: route.serviceType === "NONE",
    finalized: false,
    challenge,
  } satisfies RouteServiceSession;
}

export function getRouteServiceOffers(session: RouteServiceSession | undefined) {
  return (session?.offerIds ?? []).map((id) => {
    const offer = serviceOfferById.get(id);
    return offer ? { ...offer, price: session?.offerPrices?.[id] ?? offer.price } : undefined;
  }).filter((offer): offer is RouteServiceOffer => Boolean(offer));
}

export function resolveRouteServiceAction(session: RouteServiceSession, context: RouteServiceContext, offerId: string) {
  const catalogOffer = serviceOfferById.get(offerId);
  const offer = catalogOffer ? { ...catalogOffer, price: session.offerPrices?.[offerId] ?? catalogOffer.price } : undefined;
  if (!offer || !session.offerIds.includes(offerId) || session.purchasedOfferIds.includes(offerId)) return { session, context, error: "INVALID_OFFER" as const };
  if (session.completed || !canApplyServiceOffer(offer, context)) return { session, context, error: "OFFER_UNAVAILABLE" as const };
  const paidContext = cloneServiceContext(context);
  paidContext.gold -= offer.price;
  const applied = applyEffects(paidContext, offer.effects, `${session.sessionId}-${offerId}`);
  const choicesMade = session.choicesMade + 1;
  const nextSession: RouteServiceSession = {
    ...session,
    purchasedOfferIds: [...session.purchasedOfferIds, offerId],
    choicesMade,
    completed: offerId === "SHOP_LEAVE_GRANT_3" || choicesMade >= session.maxChoices,
    selectedEventOptionId: session.serviceType === "EVENT" ? offerId : session.selectedEventOptionId,
  };
  return { ...applied, session: nextSession, offer, purchased: session.serviceType === "SHOP" };
}

export function rerollRouteServiceSession(
  session: RouteServiceSession,
  currentGold: number,
  counters?: RouteServiceEconomyContext["counters"],
  chapter = 1,
) {
  if (session.serviceType !== "SHOP" || session.completed || session.rerollCount >= 3) return { session, error: "REROLL_UNAVAILABLE" as const };
  const price = getShopRerollPrice(session.rerollCount, chapter);
  if (price === undefined || currentGold < price) return { session, error: "INSUFFICIENT_GOLD" as const, price };
  const rerollCount = session.rerollCount + 1;
  const offerIds = buildEconomyShopInventory({
    routeId: session.routeId,
    seed: session.seed,
    currentGold: currentGold - price,
    rerollCount,
    counters,
    chapter,
  });
  return {
    session: { ...session, offerIds, offerPrices: getSessionOfferPrices(offerIds, counters, chapter), rerollCount },
    price,
  };
}

export function resolveMicroChallengeShot(session: RouteServiceSession, targetId: string) {
  const challenge = session.challenge;
  const isMiss = targetId === "MISS";
  if (!challenge || session.completed || challenge.shotsRemaining <= 0 || (!isMiss && !challenge.targetIds.includes(targetId)) || challenge.hitTargetIds.includes(targetId)) return session;
  const score = challenge.score + (isMiss ? 0 : 1);
  const shotsRemaining = challenge.shotsRemaining - 1;
  return {
    ...session,
    completed: shotsRemaining <= 0 || score >= 3,
    challenge: { ...challenge, score, shotsRemaining, hitTargetIds: isMiss ? challenge.hitTargetIds : [...challenge.hitTargetIds, targetId] },
  };
}

export function finalizeRouteService(route: RouteCardDefinition, session: RouteServiceSession, context: RouteServiceContext) {
  if (session.finalized) return { session, context };
  const next = cloneServiceContext(context);
  if (session.challenge) {
    const rewardGold = session.challenge.score >= 3 ? 10 : session.challenge.score >= 2 ? 6 : 3;
    next.gold += rewardGold;
    if (session.challenge.score >= 3) next.ballBag.push("rainbow");
  }
  const routeEffects = applyEffects(next, route.preBattleEffects, `${session.sessionId}-route`);
  return { ...routeEffects, context: routeEffects.context, session: { ...session, completed: true, finalized: true } };
}

export function consumeNextBattleEffects(context: RouteServiceContext) {
  let next = cloneServiceContext(context);
  const remaining: PendingRouteEffect[] = [];
  (context.pendingEffects ?? []).forEach((effect) => {
    const applied = applyServiceEffect(next, { ...effect, lifetime: "IMMEDIATE" }, `${effect.pendingEffectId}-consume`);
    next = applied.context;
    if (effect.lifetime === "NEXT_N_BATTLES" && (effect.remainingBattles ?? 1) > 1) remaining.push({ ...effect, remainingBattles: (effect.remainingBattles ?? 1) - 1 });
  });
  next.pendingEffects = remaining;
  return next;
}

export function resolveRouteService(
  route: RouteCardDefinition,
  context: RouteServiceContext,
  options: { buyShopItem?: boolean; offerId?: string; seed?: number } = {},
) {
  let next = applyEffects(context, route.preBattleEffects, `${route.routeId}-legacy`).context;
  let session = createRouteServiceSession(route, options.seed ?? 1);
  const offerId = options.offerId ?? (options.buyShopItem ? "SHOP_BOMB" : route.serviceType === "WORKSHOP" ? "WORKSHOP_REMOVE" : undefined);
  if (!offerId) return { context: next, session, purchased: false, slotConsumed: false };
  if (!session.offerIds.includes(offerId)) session = { ...session, offerIds: [...session.offerIds, offerId], offerPrices: { ...session.offerPrices, [offerId]: getChapterShopPrice(offerId) } };
  const resolved = resolveRouteServiceAction(session, next, offerId);
  next = resolved.context;
  return { ...resolved, context: next, purchased: "purchased" in resolved && Boolean(resolved.purchased), slotConsumed: false };
}

export function estimateNonCombatTimeRatio(routes: RouteCardDefinition[], combatDurationSec = 60) {
  const combatCount = routes.filter((route) => route.advancesBattleSlot).length;
  const serviceSeconds = routes.reduce((sum, route) => sum + route.serviceDurationSec, 0);
  const total = combatCount * combatDurationSec + serviceSeconds;
  return total > 0 ? serviceSeconds / total : 0;
}

export function selectRouteOnce(args: {
  state: RouteFlowState;
  route: RouteCardDefinition;
  slotIndex: number;
  enemyId: string;
  selectedAt: number;
  generationId?: string;
}) {
  const generationId = args.generationId ?? args.state.pendingRouteGenerationId;
  const duplicate = args.route.advancesBattleSlot
    ? args.state.routeHistory.some((entry) => entry.nodeKind !== "STANDALONE_SERVICE" && entry.slotIndex === args.slotIndex)
    : args.state.routeHistory.some((entry) => entry.generationId === generationId && entry.routeId === args.route.routeId);
  if (duplicate) return { state: args.state, duplicate: true };
  const historyEntry: RouteHistoryEntry = {
    slotIndex: args.slotIndex,
    routeId: args.route.routeId,
    generationId,
    nodeKind: args.route.nodeKind,
    serviceType: args.route.serviceType,
    battleSlotIndexBefore: args.route.advancesBattleSlot ? Math.max(0, args.slotIndex - 1) : args.state.currentSlotIndex,
    battleSlotIndexAfter: args.route.advancesBattleSlot ? args.slotIndex : args.state.currentSlotIndex,
    primaryArchetype: args.route.primaryArchetype,
    enemyId: args.enemyId,
    templateId: args.route.boardTemplatePoolId,
    selectedAt: args.selectedAt,
    completedAt: args.selectedAt,
  };
  const isStandalone = args.route.nodeKind === "STANDALONE_SERVICE";
  return {
    duplicate: false,
    state: {
      ...args.state,
      currentSlotIndex: args.route.advancesBattleSlot ? args.slotIndex : args.state.currentSlotIndex,
      selectedRouteId: args.route.routeId,
      pendingRouteGenerationId: undefined,
      pendingRouteSeed: undefined,
      pendingRouteOptions: [],
      recentRouteArchetypes: [...args.state.recentRouteArchetypes, args.route.primaryArchetype].slice(-2),
      recentEnemyFamilies: [...args.state.recentEnemyFamilies, args.route.enemyPoolId].slice(-2),
      recentTemplateFamilyIds: [...args.state.recentTemplateFamilyIds, args.route.boardTemplatePoolId].slice(-2),
      routeHistory: [...args.state.routeHistory, historyEntry],
      standaloneNodeCountThisChapter: args.state.standaloneNodeCountThisChapter + (isStandalone ? 1 : 0),
      standaloneShopUsed: args.state.standaloneShopUsed || (isStandalone && args.route.serviceType === "SHOP"),
      standaloneRestUsed: args.state.standaloneRestUsed || (isStandalone && args.route.serviceType === "REST"),
      previousNodeWasStandalone: isStandalone,
      recentServiceTypes: args.route.serviceType === "NONE"
        ? args.state.recentServiceTypes
        : [...args.state.recentServiceTypes, args.route.serviceType].slice(-3),
    },
  };
}

export function restoreRouteFlowState(saved?: Partial<RouteFlowState>): RouteFlowState {
  const fresh = createRouteFlowState();
  if (!saved) return fresh;
  return {
    ...fresh,
    ...saved,
    pendingRouteOptions: Array.isArray(saved.pendingRouteOptions) ? saved.pendingRouteOptions.filter((id) => routeById.has(id)) : [],
    recentRouteArchetypes: Array.isArray(saved.recentRouteArchetypes) ? saved.recentRouteArchetypes.slice(-2) : [],
    recentEnemyFamilies: Array.isArray(saved.recentEnemyFamilies) ? saved.recentEnemyFamilies.slice(-2) : [],
    recentTemplateFamilyIds: Array.isArray(saved.recentTemplateFamilyIds) ? saved.recentTemplateFamilyIds.slice(-2) : [],
    routeHistory: Array.isArray(saved.routeHistory) ? saved.routeHistory.map((entry) => ({
      ...entry,
      nodeKind: entry.nodeKind ?? "COMBAT_PACKAGE",
      serviceType: entry.serviceType ?? "NONE",
      battleSlotIndexBefore: entry.battleSlotIndexBefore ?? Math.max(0, entry.slotIndex - 1),
      battleSlotIndexAfter: entry.battleSlotIndexAfter ?? entry.slotIndex,
      completedAt: entry.completedAt ?? entry.selectedAt,
    })) : [],
    standaloneNodeCountThisChapter: Math.max(0, Math.min(2, saved.standaloneNodeCountThisChapter ?? 0)),
    standaloneShopUsed: Boolean(saved.standaloneShopUsed),
    standaloneRestUsed: Boolean(saved.standaloneRestUsed),
    previousNodeWasStandalone: Boolean(saved.previousNodeWasStandalone),
    recentServiceTypes: Array.isArray(saved.recentServiceTypes) ? saved.recentServiceTypes.slice(-3) : [],
    pendingEffects: Array.isArray(saved.pendingEffects) ? saved.pendingEffects.map((effect) => ({ ...effect })) : [],
    pendingService: saved.pendingService && routeById.has(saved.pendingService.routeId)
      ? createRouteServiceSession(routeById.get(saved.pendingService.routeId)!, saved.pendingService.seed, saved.pendingService)
      : undefined,
  };
}

export function validateNonCombatContent() {
  const errors: string[] = [];
  const routeIds = new Set<string>();
  routeCatalog.forEach((route) => {
    if (routeIds.has(route.routeId)) errors.push(`DUPLICATE_ROUTE:${route.routeId}`);
    routeIds.add(route.routeId);
    if (route.nodeKind === "STANDALONE_SERVICE" && route.advancesBattleSlot) errors.push(`STANDALONE_ADVANCES_SLOT:${route.routeId}`);
    if (route.nodeKind === "COMBAT_PACKAGE" && !route.advancesBattleSlot) errors.push(`COMBAT_DOES_NOT_ADVANCE:${route.routeId}`);
    if (route.serviceDurationSec > route.estimatedDurationSec) errors.push(`INVALID_DURATION:${route.routeId}`);
    if (route.serviceType !== "NONE") {
      const session = createRouteServiceSession(route, 1);
      if (session.offerIds.some((id) => !serviceOfferById.has(id))) errors.push(`UNKNOWN_OFFER:${route.routeId}`);
      if (route.serviceType === "SHOP" && (session.offerIds.length !== 3 || session.maxChoices !== 2)) errors.push(`INVALID_SHOP:${route.routeId}`);
      if (route.serviceType === "EVENT" && session.offerIds.length !== 2) errors.push(`INVALID_EVENT:${route.routeId}`);
      if (route.serviceType === "MICRO_BUBBLE_CHALLENGE" && session.challenge?.shotBudget !== 3) errors.push(`INVALID_MICRO_CHALLENGE:${route.routeId}`);
    }
  });
  const offerIds = new Set<string>();
  routeServiceOfferCatalog.forEach((offer) => {
    if (offerIds.has(offer.offerId)) errors.push(`DUPLICATE_OFFER:${offer.offerId}`);
    offerIds.add(offer.offerId);
    if (offer.price < 0 || !offer.effects.length) errors.push(`INVALID_OFFER:${offer.offerId}`);
  });
  return errors;
}

const nonCombatContentErrors = validateNonCombatContent();
if (nonCombatContentErrors.length) throw new Error(`非战斗路线配置无效：${nonCombatContentErrors.join("，")}`);

export function getChapterProgress(currentSlotIndex: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const slotIndex = index + 1;
    return {
      slotIndex,
      nodeType: getSlotNodeType(slotIndex),
      state: slotIndex < currentSlotIndex ? "COMPLETED" as const : slotIndex === currentSlotIndex ? "CURRENT" as const : "UPCOMING" as const,
    };
  });
}
