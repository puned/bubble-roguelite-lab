import {
  EffectQueue,
  ballBoardConfig,
  getBallDefinition,
  getBoardBubbleDefinition,
  getCharacterInitialBallIds,
  getRelicDefinition,
  getStatusDefinition,
  relicConfig,
  statusCoreConfig,
  type Condition,
  type EffectQueueItem,
  type RelicDefinition,
} from "./core-content.ts";

export type CoreBallKind = "red" | "blue" | "yellow" | "green" | "bomb" | "fire" | "ice" | "rainbow" | "pierce" | "curseWeb";
export type CoreColor = "red" | "blue" | "yellow" | "green";

const ballIdToKind: Record<string, CoreBallKind> = {
  BALL_RED: "red",
  BALL_BLUE: "blue",
  BALL_YELLOW: "yellow",
  BALL_GREEN: "green",
  BALL_BOMB: "bomb",
  BALL_FIRE: "fire",
  BALL_ICE: "ice",
  BALL_RAINBOW: "rainbow",
  BALL_PIERCE: "pierce",
  BALL_CURSE_WEB: "curseWeb",
};
const kindToBallId = Object.fromEntries(Object.entries(ballIdToKind).map(([id, kind]) => [kind, id])) as Record<CoreBallKind, string>;
const colorOrder: CoreColor[] = ballBoardConfig.globalRules.activeNormalColors
  ? (ballBoardConfig.globalRules.activeNormalColors as string[]).map((color) => color.toLowerCase() as CoreColor)
  : ["red", "blue", "yellow", "green"];

export const getBallIdForKind = (kind: CoreBallKind) => kindToBallId[kind];
export const getKindForBallId = (ballId: string) => ballIdToKind[ballId];
export const createConfiguredInitialBallBag = () => getCharacterInitialBallIds().map((id) => {
  const kind = getKindForBallId(id);
  if (!kind) throw new Error(`角色球包包含未映射 P1 球：${id}`);
  return kind;
});

export const isNormalMatch = (count: number) => count >= Number(ballBoardConfig.globalRules.normalMatchCount ?? 3);
export const webPreventsDetach = () => Boolean((ballBoardConfig.boardModifiers.find((modifier) => modifier.modifierId === "MOD_WEB")?.rules.preventsDetachDrop));
export const getShotResolutionPriority = () => [...statusCoreConfig.shotResolutionPriority];

export function getEquivalentColor(kind: CoreBallKind): CoreColor | "rainbow" | "dynamic" | null {
  const value = getBallDefinition(getBallIdForKind(kind))?.equivalentColor;
  if (value === "RAINBOW") return "rainbow";
  if (value === "DYNAMIC") return "dynamic";
  const color = value?.toLowerCase();
  return colorOrder.includes(color as CoreColor) ? color as CoreColor : null;
}

export type RainbowCandidate = { color: CoreColor; immediateMatchSize: number; dropPotential: number; activeColorWeight: number };

export function selectRainbowColor(candidates: RainbowCandidate[]) {
  if (!candidates.length) return colorOrder[0];
  return [...candidates].sort((a, b) =>
    b.immediateMatchSize - a.immediateMatchSize
    || b.dropPotential - a.dropPotential
    || b.activeColorWeight - a.activeColorWeight
    || colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color),
  )[0].color;
}

export function getPierceStopCollision<T>(collisions: T[]) {
  return collisions[1] ?? null;
}

export function canBombClearBubble(bubbleId: string) {
  const target = getBoardBubbleDefinition(bubbleId);
  if (!target) return false;
  const effect = getBallDefinition("BALL_BOMB")?.effects.find((item) => item.effectType === "CLEAR_RADIUS");
  if (target.bubbleType === "CORE") return Boolean(effect?.includeCore);
  if (target.bubbleType === "OBSTACLE") return Boolean(effect?.includeObstacle);
  return true;
}

export function shouldTriggerFireEffects(matchSize: number, sourceIncluded = true) {
  return sourceIncluded && matchSize >= Number(ballBoardConfig.globalRules.normalMatchCount ?? 3);
}

export function resolveIcePressure(pressure: number, matched: boolean) {
  if (!matched) return Math.max(0, pressure);
  const effect = getBallDefinition("BALL_ICE")?.effects.find((item) => item.effectType === "MODIFY_PRESSURE");
  return Math.max(Number(effect?.minimum ?? 0), pressure + Number(effect?.value ?? 0));
}

export function getSpecialEffectMultiplier(mirrorBubbleCount: number) {
  if (mirrorBubbleCount <= 0) return 1;
  const mirror = getBoardBubbleDefinition("BUBBLE_MIRROR");
  const aura = (mirror?.auraEffects as Array<Record<string, unknown>> | undefined)?.find((item) => item.effectType === "MODIFY_PLAYER_SPECIAL_EFFECT");
  return Number(aura?.multiplier ?? 1);
}

export type RuntimeStatus = {
  statusId: string;
  value: number;
  remainingPlayerShots?: number;
  remainingEnemyActions?: number;
};

export function addOrRefreshStatus(statuses: RuntimeStatus[], statusId: string, args: { value?: number; playerShots?: number; enemyActions?: number }) {
  const definition = getStatusDefinition(statusId);
  if (!definition) throw new Error(`未找到状态：${statusId}`);
  const next = statuses.map((status) => ({ ...status }));
  const existing = next.find((status) => status.statusId === statusId);
  const incomingValue = Number(args.value ?? definition.defaultValue ?? definition.damageMultiplier ?? 0);
  const maxValue = Number(definition.maxValue ?? definition.maxDamageMultiplier ?? Number.POSITIVE_INFINITY);
  if (!existing) {
    next.push({
      statusId,
      value: Math.min(maxValue, incomingValue),
      remainingPlayerShots: (args.playerShots ?? Number(definition.defaultDurationPlayerShots ?? 0)) || undefined,
      remainingEnemyActions: (args.enemyActions ?? Number(definition.defaultDurationEnemyActions ?? 0)) || undefined,
    });
    return next;
  }
  if (definition.stackMode === "ADD_VALUE_REFRESH_DURATION") existing.value = Math.min(maxValue, existing.value + incomingValue);
  else existing.value = Math.min(maxValue, Math.max(existing.value, incomingValue));
  if (args.playerShots != null || definition.defaultDurationPlayerShots != null) existing.remainingPlayerShots = Math.max(existing.remainingPlayerShots ?? 0, args.playerShots ?? Number(definition.defaultDurationPlayerShots));
  if (args.enemyActions != null || definition.defaultDurationEnemyActions != null) existing.remainingEnemyActions = Math.max(existing.remainingEnemyActions ?? 0, args.enemyActions ?? Number(definition.defaultDurationEnemyActions));
  return next;
}

export function getEnemyDamageMultiplier(statuses: RuntimeStatus[]) {
  const vulnerable = statuses.find((status) => status.statusId === "STATUS_VULNERABLE_ENEMY" && (status.remainingPlayerShots ?? 0) > 0);
  return Math.min(Number(getStatusDefinition("STATUS_VULNERABLE_ENEMY")?.maxDamageMultiplier ?? 1.5), vulnerable?.value ?? 1);
}

export function tickStatuses(statuses: RuntimeStatus[], unit: "PLAYER_SHOT" | "ENEMY_ACTION") {
  return statuses.map((status) => ({
    ...status,
    remainingPlayerShots: unit === "PLAYER_SHOT" && status.remainingPlayerShots != null ? status.remainingPlayerShots - 1 : status.remainingPlayerShots,
    remainingEnemyActions: unit === "ENEMY_ACTION" && status.remainingEnemyActions != null ? status.remainingEnemyActions - 1 : status.remainingEnemyActions,
  })).filter((status) => (status.remainingPlayerShots ?? 1) > 0 && (status.remainingEnemyActions ?? 1) > 0);
}

export type RelicTriggerEvent = {
  trigger: string;
  battleId: string;
  shotId?: string;
  directMatchClearCount?: number;
  clearedColorCounts?: Partial<Record<CoreColor, number>>;
  droppedBubbleCount?: number;
  dropCause?: string;
  modifierId?: string;
  removedModifierCount?: number;
  battleResult?: string;
  hpPercentBefore?: number;
  hpPercentAfter?: number;
  consumedShotIndex?: number;
  reboundCount?: number;
  statusId?: string;
  remainingShotsBefore?: number;
  remainingShotsAfter?: number;
  runBallBagSize?: number;
  bubbleId?: string;
};

export type RelicRuntimeState = {
  triggerCounts: Record<string, number>;
  removedRelicIds: string[];
};

export const createRelicRuntimeState = (): RelicRuntimeState => ({ triggerCounts: {}, removedRelicIds: [] });

function conditionMatches(condition: Condition, event: RelicTriggerEvent) {
  const value = Number(condition.value ?? 0);
  switch (condition.type) {
    case "DROP_CAUSE_EQUALS": return event.dropCause === condition.value;
    case "DIRECT_MATCH_CLEAR_COUNT_EQUALS": return event.directMatchClearCount === value;
    case "MODIFIER_ID_EQUALS": return event.modifierId === condition.value;
    case "BATTLE_RESULT_EQUALS": return event.battleResult === condition.value;
    case "CLEARED_COLOR_COUNT_AT_LEAST": return Number(event.clearedColorCounts?.[String(condition.color).toLowerCase() as CoreColor] ?? 0) >= value;
    case "HP_PERCENT_CROSSED_BELOW": return Number(event.hpPercentBefore ?? 0) >= value && Number(event.hpPercentAfter ?? 1) < value;
    case "DROPPED_BUBBLE_COUNT_AT_LEAST": return Number(event.droppedBubbleCount ?? 0) >= value;
    case "CONSUMED_SHOT_INDEX_MOD_EQUALS": return Number(event.consumedShotIndex ?? -1) % Number(condition.divisor) === Number(condition.remainder);
    case "REBOUND_COUNT_AT_LEAST": return Number(event.reboundCount ?? 0) >= value;
    case "STATUS_ID_EQUALS": return event.statusId === condition.value;
    case "REMAINING_SHOTS_CROSSED_TO_OR_BELOW": return Number(event.remainingShotsBefore ?? 0) > value && Number(event.remainingShotsAfter ?? 0) <= value;
    case "RUN_BALL_BAG_SIZE_AT_MOST": return Number(event.runBallBagSize ?? Number.POSITIVE_INFINITY) <= value;
    case "REMOVED_MODIFIER_COUNT_AT_LEAST": return Number(event.removedModifierCount ?? 0) >= value;
    case "SAME_PLAYER_SHOT": return Boolean(event.shotId) === Boolean(condition.value);
    case "BUBBLE_ID_EQUALS": return event.bubbleId === condition.value;
    default: return false;
  }
}

function effectsForTrigger(relic: RelicDefinition, trigger: string) {
  if (relic.trigger !== "MULTI_TRIGGER") return relic.trigger === trigger ? relic.effects : [];
  return relic.effects.filter((effect) => effect.trigger === trigger);
}

function underTriggerLimit(relic: RelicDefinition, event: RelicTriggerEvent, state: RelicRuntimeState) {
  const checks: Array<[string, number | undefined]> = [
    [`${relic.relicId}:run`, relic.limits?.maxTriggersPerRun],
    [`${relic.relicId}:battle:${event.battleId}`, relic.limits?.maxTriggersPerBattle],
    [`${relic.relicId}:shot:${event.shotId ?? "none"}`, relic.limits?.maxTriggersPerShot],
  ];
  return checks.every(([key, max]) => max == null || (state.triggerCounts[key] ?? 0) < max);
}

export function resolveRelicTriggers(ownedRelicIds: string[], event: RelicTriggerEvent, state: RelicRuntimeState) {
  const next: RelicRuntimeState = { triggerCounts: { ...state.triggerCounts }, removedRelicIds: [...state.removedRelicIds] };
  const queue = new EffectQueue();
  const triggeredRelicIds: string[] = [];
  [...new Set(ownedRelicIds)].forEach((relicId) => {
    if (next.removedRelicIds.includes(relicId)) return;
    const relic = getRelicDefinition(relicId);
    if (!relic) return;
    const effects = effectsForTrigger(relic, event.trigger);
    if (!effects.length || !relic.conditions?.every((condition) => conditionMatches(condition, event)) && relic.conditions?.length) return;
    if (!underTriggerLimit(relic, event, next)) return;
    triggeredRelicIds.push(relicId);
    const keys = [`${relicId}:run`, `${relicId}:battle:${event.battleId}`, `${relicId}:shot:${event.shotId ?? "none"}`];
    keys.forEach((key) => { next.triggerCounts[key] = (next.triggerCounts[key] ?? 0) + 1; });
    queue.enqueueMany(effects.map((effect) => ({ sourceId: relicId, effect })));
  });
  return { state: next, queue, triggeredRelicIds };
}

export function acquireRelic(ownedRelicIds: string[], relicId: string) {
  const relic = getRelicDefinition(relicId);
  if (!relic) throw new Error(`未找到遗物：${relicId}`);
  if (relic.stackRule === "UNIQUE" && ownedRelicIds.includes(relicId)) return { relicIds: [...ownedRelicIds], acquired: false, upgraded: false };
  if (relic.stackRule === "UPGRADE" && ownedRelicIds.includes(relicId)) return { relicIds: [...ownedRelicIds], acquired: false, upgraded: true };
  return { relicIds: [...ownedRelicIds, relicId], acquired: true, upgraded: false };
}

export function resolveDeathProtection(args: { hp: number; maxHp: number; pressure: number; relicIds: string[]; state: RelicRuntimeState }) {
  if (args.hp > 0) return { ...args, consumedRelicId: undefined };
  if (args.relicIds.includes("RELIC_LUCKY_BELL") && (args.state.triggerCounts[`RELIC_LUCKY_BELL:battle:current`] ?? 0) < 1) {
    return {
      ...args,
      hp: 1,
      pressure: 0,
      state: { ...args.state, triggerCounts: { ...args.state.triggerCounts, "RELIC_LUCKY_BELL:battle:current": 1 } },
      consumedRelicId: "RELIC_LUCKY_BELL",
    };
  }
  if (args.relicIds.includes("RELIC_PHOENIX_FEATHER") && !args.state.removedRelicIds.includes("RELIC_PHOENIX_FEATHER")) {
    return {
      ...args,
      hp: Math.ceil(args.maxHp * .3),
      state: { ...args.state, removedRelicIds: [...args.state.removedRelicIds, "RELIC_PHOENIX_FEATHER"] },
      consumedRelicId: "RELIC_PHOENIX_FEATHER",
    };
  }
  return { ...args, consumedRelicId: undefined };
}

export type ShotEndState = { enemyDefeated: boolean; bossPhaseChanged: boolean; phaseShotGrant: number; remainingShots: number; boardEmpty: boolean };
export function resolveShotEndPriority(state: ShotEndState) {
  const steps: string[] = [];
  let remainingShots = state.remainingShots;
  if (state.enemyDefeated) return { outcome: "VICTORY", remainingShots, refillBoard: false, steps: ["VICTORY"] };
  if (state.bossPhaseChanged) {
    steps.push("BOSS_PHASE_TRANSITION_AND_PHASE_SHOT_GRANT");
    remainingShots += Math.max(0, state.phaseShotGrant);
  }
  if (remainingShots <= 0) return { outcome: "SHOT_LIMIT_EXHAUSTED", remainingShots, refillBoard: false, steps: [...steps, "SHOT_BUDGET_EXHAUSTION_CHECK"] };
  if (state.boardEmpty) return { outcome: "CONTINUE", remainingShots, refillBoard: true, steps: [...steps, "BOARD_CLEAR_REFILL_IF_PLAYER_CAN_CONTINUE"] };
  return { outcome: "CONTINUE", remainingShots, refillBoard: false, steps };
}

export function getDropDamageCap(nodeType: "NORMAL_EARLY" | "NORMAL_LATE" | "ELITE" | "BOSS") {
  return Number(statusCoreConfig.damage.dropDamageCaps[nodeType]);
}

export function coreRelicDefinitions() {
  return relicConfig.relics;
}

export function drainEffectItems(items: EffectQueueItem[]) {
  const queue = new EffectQueue();
  queue.enqueueMany(items);
  return queue.drain((item) => ({ event: { source_id: item.sourceId, target_id: item.targetId, effect_type: item.effect.effectType } }));
}
