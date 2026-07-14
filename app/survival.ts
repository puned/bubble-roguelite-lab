import {
  calculateOverflowDamage,
  getPressureBubbleWeight,
  pressureOverflowConfig,
  type PressureBubble,
  type PressureOverflowConfig,
} from "./pressure-overflow.ts";

export type DamageType = "ENEMY_ATTACK" | "PRESSURE_OVERFLOW" | "STATUS_DAMAGE" | "SELF_COST" | "TRUE_DAMAGE";
export type FailureReason = "PLAYER_HP_ZERO" | "OBJECTIVE_FAILED" | "SHOT_LIMIT_EXHAUSTED" | "BOSS_ENRAGE" | "SCRIPTED_FAILURE";
export type DangerLevel = "NORMAL" | "WARNING" | "DANGER" | "CRITICAL";
export type BattleNodeType = "NORMAL_BATTLE" | "ELITE_BATTLE" | "BOSS_BATTLE";
export type HealSourceType = "COMBAT" | "BATTLE_END" | "REVIVE" | "REST" | "EVENT";

export type StatusInstance = {
  id: string;
  stacks: number;
  remainingTriggers: number;
  damagePerTrigger?: number;
};

export type PlayerHealthState = {
  currentHp: number;
  maxHp: number;
  shield: number;
  shieldMax: number;
  overflowCountThisBattle: number;
  combatHealingUsed: number;
  reviveCountThisRun: number;
  reviveCountThisBattle: number;
  deathPreventUsedThisBattle: boolean;
  isDowned: boolean;
  damageTakenThisBattle: number;
  healingReceivedThisBattle: number;
  shieldAbsorbedThisBattle: number;
  damageByType: Record<DamageType, number>;
  statuses: StatusInstance[];
};

export type DamageEvent = {
  eventId: string;
  sourceId: string;
  sourceType: string;
  damageType: DamageType;
  baseValue: number;
  canBeBlockedByShield: boolean;
  canKillPlayer: boolean;
  tags: string[];
  metadata?: Record<string, unknown>;
};

export type DamageResult = {
  eventId: string;
  rawDamage: number;
  finalDamage: number;
  shieldDamage: number;
  hpDamage: number;
  hpBefore: number;
  hpAfter: number;
  shieldBefore: number;
  shieldAfter: number;
  causedDowned: boolean;
  duplicate: boolean;
};

export type FailureState = {
  reason: FailureReason;
  sourceId?: string;
  levelId: string;
  battleId: string;
  reviveAllowed: boolean;
  runWillEnd: boolean;
  detail?: Record<string, unknown>;
};

export type SurvivalBubble = PressureBubble;

export type PlayerSurvivalUiSnapshot = {
  currentHp: number;
  maxHp: number;
  hpPercent: number;
  shield: number;
  shieldMax: number;
  dangerLevel: DangerLevel;
  nextEnemyDamage?: number;
  enemyIntentShotsRemaining?: number;
  overflowWarning: boolean;
  predictedOverflowDamage?: number;
  reviveAvailable: boolean;
};

export const survivalConfig = {
  playerHealth: {
    defaultMaxHp: 100,
    maxHpCap: 160,
    shieldCapPercent: .5,
    shieldClearAfterBattle: true,
    combatHealingCapPercent: .15,
    maxHpUpgradeValue: 8,
    battleEndRecovery: {
      NORMAL_BATTLE: { type: "FIXED", value: 4 },
      ELITE_BATTLE: { type: "FIXED", value: 12 },
      BOSS_BATTLE: { type: "MAX_HP_PERCENT", value: .25 },
    },
  },
  pressureOverflow: {
    ...pressureOverflowConfig.damage,
    defaultDamageCaps: {
      NORMAL_EARLY: 16,
      NORMAL_LATE: 24,
      ELITE: 28,
      BOSS: 32,
    },
  },
  revive: {
    enabled: true,
    maxManualRevivesPerBattle: 1,
    maxManualRevivesPerRun: 1,
    restoreHpPercent: .35,
    grantShieldPercent: .1,
    delayEnemyIntentShots: 1,
    removeDangerousBottomBubbleCount: 5,
    allowedFailureReasons: ["PLAYER_HP_ZERO"] as FailureReason[],
  },
} as const;

const emptyDamageByType = (): Record<DamageType, number> => ({
  ENEMY_ATTACK: 0,
  PRESSURE_OVERFLOW: 0,
  STATUS_DAMAGE: 0,
  SELF_COST: 0,
  TRUE_DAMAGE: 0,
});

export function createPlayerHealthState(saved?: Partial<PlayerHealthState>): PlayerHealthState {
  const maxHp = Math.min(survivalConfig.playerHealth.maxHpCap, Math.max(1, saved?.maxHp ?? survivalConfig.playerHealth.defaultMaxHp));
  const shieldMax = Math.floor(maxHp * survivalConfig.playerHealth.shieldCapPercent);
  return {
    currentHp: Math.min(maxHp, Math.max(0, saved?.currentHp ?? maxHp)),
    maxHp,
    shield: Math.min(shieldMax, Math.max(0, saved?.shield ?? 0)),
    shieldMax,
    overflowCountThisBattle: Math.max(0, saved?.overflowCountThisBattle ?? 0),
    combatHealingUsed: Math.max(0, saved?.combatHealingUsed ?? 0),
    reviveCountThisRun: Math.max(0, saved?.reviveCountThisRun ?? 0),
    reviveCountThisBattle: Math.max(0, saved?.reviveCountThisBattle ?? 0),
    deathPreventUsedThisBattle: saved?.deathPreventUsedThisBattle ?? false,
    isDowned: saved?.isDowned ?? false,
    damageTakenThisBattle: Math.max(0, saved?.damageTakenThisBattle ?? 0),
    healingReceivedThisBattle: Math.max(0, saved?.healingReceivedThisBattle ?? 0),
    shieldAbsorbedThisBattle: Math.max(0, saved?.shieldAbsorbedThisBattle ?? 0),
    damageByType: { ...emptyDamageByType(), ...(saved?.damageByType ?? {}) },
    statuses: Array.isArray(saved?.statuses) ? saved.statuses.map((status) => ({ ...status })) : [],
  };
}

export function beginBattleSurvival(state: PlayerHealthState): PlayerHealthState {
  return {
    ...state,
    shield: 0,
    overflowCountThisBattle: 0,
    combatHealingUsed: 0,
    reviveCountThisBattle: 0,
    deathPreventUsedThisBattle: false,
    isDowned: false,
    damageTakenThisBattle: 0,
    healingReceivedThisBattle: 0,
    shieldAbsorbedThisBattle: 0,
    damageByType: emptyDamageByType(),
    statuses: [],
  };
}

export function resolvePlayerDamage(
  state: PlayerHealthState,
  event: DamageEvent,
  processedEventIds: ReadonlySet<string> = new Set(),
  modifiers: { difficultyMultiplier?: number; incomingMultiplier?: number; flatReduction?: number } = {},
) {
  const hpBefore = state.currentHp;
  const shieldBefore = state.shield;
  if (processedEventIds.has(event.eventId)) {
    return {
      state,
      processedEventIds: new Set(processedEventIds),
      result: {
        eventId: event.eventId, rawDamage: event.baseValue, finalDamage: 0, shieldDamage: 0, hpDamage: 0,
        hpBefore, hpAfter: hpBefore, shieldBefore, shieldAfter: shieldBefore, causedDowned: false, duplicate: true,
      } satisfies DamageResult,
    };
  }

  const rawDamage = Math.max(0, event.baseValue);
  const finalDamage = Math.max(0, Math.ceil(
    rawDamage * (modifiers.difficultyMultiplier ?? 1) * (modifiers.incomingMultiplier ?? 1) - (modifiers.flatReduction ?? 0),
  ));
  const shieldDamage = event.canBeBlockedByShield ? Math.min(state.shield, finalDamage) : 0;
  let hpDamage = Math.max(0, finalDamage - shieldDamage);
  if (!event.canKillPlayer && hpDamage >= state.currentHp) hpDamage = Math.max(0, state.currentHp - 1);
  const hpAfter = Math.max(0, state.currentHp - hpDamage);
  const nextState: PlayerHealthState = {
    ...state,
    currentHp: hpAfter,
    shield: Math.max(0, state.shield - shieldDamage),
    isDowned: hpAfter <= 0,
    damageTakenThisBattle: state.damageTakenThisBattle + hpDamage,
    shieldAbsorbedThisBattle: state.shieldAbsorbedThisBattle + shieldDamage,
    damageByType: { ...state.damageByType, [event.damageType]: state.damageByType[event.damageType] + hpDamage },
  };
  const nextEventIds = new Set(processedEventIds);
  nextEventIds.add(event.eventId);
  return {
    state: nextState,
    processedEventIds: nextEventIds,
    result: {
      eventId: event.eventId,
      rawDamage,
      finalDamage,
      shieldDamage,
      hpDamage,
      hpBefore,
      hpAfter,
      shieldBefore,
      shieldAfter: nextState.shield,
      causedDowned: hpAfter <= 0,
      duplicate: false,
    } satisfies DamageResult,
  };
}

export function addShield(state: PlayerHealthState, value: number) {
  const actual = Math.min(Math.max(0, value), Math.max(0, state.shieldMax - state.shield));
  return { state: { ...state, shield: state.shield + actual }, actual };
}

export function clearShield(state: PlayerHealthState) {
  return { ...state, shield: 0 };
}

export function healPlayer(state: PlayerHealthState, value: number, sourceType: HealSourceType) {
  const requested = Math.max(0, value);
  const missing = Math.max(0, state.maxHp - state.currentHp);
  const combatCap = Math.floor(state.maxHp * survivalConfig.playerHealth.combatHealingCapPercent);
  const remainingCombatHealing = sourceType === "COMBAT" ? Math.max(0, combatCap - state.combatHealingUsed) : requested;
  const actual = Math.min(requested, missing, remainingCombatHealing);
  return {
    state: {
      ...state,
      currentHp: state.currentHp + actual,
      combatHealingUsed: state.combatHealingUsed + (sourceType === "COMBAT" ? actual : 0),
      healingReceivedThisBattle: state.healingReceivedThisBattle + actual,
    },
    actual,
  };
}

export function increaseMaxHp(state: PlayerHealthState, value = survivalConfig.playerHealth.maxHpUpgradeValue, healSameAmount = true) {
  const nextMax = Math.min(survivalConfig.playerHealth.maxHpCap, state.maxHp + Math.max(0, value));
  const increase = nextMax - state.maxHp;
  const nextShieldMax = Math.floor(nextMax * survivalConfig.playerHealth.shieldCapPercent);
  return {
    state: {
      ...state,
      maxHp: nextMax,
      currentHp: Math.min(nextMax, state.currentHp + (healSameAmount ? increase : 0)),
      shieldMax: nextShieldMax,
      shield: Math.min(nextShieldMax, state.shield),
    },
    increase,
  };
}

export function getLevelSurvivalRules(levelOrder: number, nodeType: BattleNodeType) {
  const attackDamage = [4, 5, 5, 6, 8, 6, 7, 8, 9, 8][Math.max(0, Math.min(9, levelOrder - 1))];
  const overflowCaps = [16, 18, 18, 20, 28, 20, 22, 22, 24, 32];
  const recovery = levelOrder === 9 ? { type: "FIXED" as const, value: 5 } : survivalConfig.playerHealth.battleEndRecovery[nodeType];
  return {
    attackDamage,
    phaseAttackDamage: levelOrder === 10 ? [8, 10, 12] as const : [attackDamage, attackDamage, attackDamage] as const,
    overflowDamageCap: overflowCaps[Math.max(0, Math.min(9, levelOrder - 1))],
    battleEndRecovery: recovery,
  };
}

export function applyBattleEndRecovery(state: PlayerHealthState, levelOrder: number, nodeType: BattleNodeType) {
  const recovery = getLevelSurvivalRules(levelOrder, nodeType).battleEndRecovery;
  const requested = recovery.type === "MAX_HP_PERCENT" ? Math.ceil(state.maxHp * recovery.value) : recovery.value;
  const healed = healPlayer(state, requested, "BATTLE_END");
  return { state: clearShield(healed.state), actual: healed.actual };
}

export function getOverflowBubbleWeight(bubble: SurvivalBubble) {
  return getPressureBubbleWeight(bubble);
}

export function calculatePressureOverflow(bubbles: SurvivalBubble[], overflowCountThisBattle: number, damageCap: number, config?: PressureOverflowConfig) {
  const damage = calculateOverflowDamage({ bubbles, overflowCountBeforeResolve: overflowCountThisBattle, damageCap, config });
  return {
    overflowBubbleIds: bubbles.map((bubble) => bubble.id),
    overflowWeight: damage.overflowWeight,
    repeatMultiplier: damage.repeatMultiplier,
    rawDamage: damage.rawDamage,
    cappedDamage: damage.cappedDamage,
  };
}

export function getDangerLevel(currentHp: number, maxHp: number): DangerLevel {
  const ratio = maxHp > 0 ? currentHp / maxHp : 0;
  if (ratio <= .15) return "CRITICAL";
  if (ratio <= .30) return "DANGER";
  if (ratio <= .50) return "WARNING";
  return "NORMAL";
}

export function canManualRevive(state: PlayerHealthState, reason: FailureReason) {
  return survivalConfig.revive.enabled
    && survivalConfig.revive.allowedFailureReasons.includes(reason)
    && state.reviveCountThisBattle < survivalConfig.revive.maxManualRevivesPerBattle
    && state.reviveCountThisRun < survivalConfig.revive.maxManualRevivesPerRun;
}

export function performManualRevive(state: PlayerHealthState) {
  const currentHp = Math.ceil(state.maxHp * survivalConfig.revive.restoreHpPercent);
  const shield = Math.min(state.shieldMax, Math.floor(state.maxHp * survivalConfig.revive.grantShieldPercent));
  return {
    ...state,
    currentHp,
    shield,
    reviveCountThisBattle: state.reviveCountThisBattle + 1,
    reviveCountThisRun: state.reviveCountThisRun + 1,
    isDowned: false,
    statuses: [],
  };
}

export function performDeathPrevent(state: PlayerHealthState) {
  return {
    ...state,
    currentHp: Math.max(1, Math.ceil(state.maxHp * .30)),
    isDowned: false,
    deathPreventUsedThisBattle: true,
    statuses: [],
  };
}

export function getDangerousBubbleIds(bubbles: SurvivalBubble[], count = survivalConfig.revive.removeDangerousBottomBubbleCount) {
  return [...bubbles]
    .sort((a, b) => b.row - a.row || getOverflowBubbleWeight(b) - getOverflowBubbleWeight(a))
    .slice(0, Math.max(0, count))
    .map((bubble) => bubble.id);
}

export function createFailureState(args: Omit<FailureState, "reviveAllowed" | "runWillEnd"> & { health: PlayerHealthState }) {
  return {
    reason: args.reason,
    sourceId: args.sourceId,
    levelId: args.levelId,
    battleId: args.battleId,
    reviveAllowed: canManualRevive(args.health, args.reason),
    runWillEnd: true,
    detail: args.detail,
  } satisfies FailureState;
}

export function createSurvivalUiSnapshot(args: {
  health: PlayerHealthState;
  nextEnemyDamage?: number;
  enemyIntentShotsRemaining?: number;
  overflowWarning: boolean;
  predictedOverflowDamage?: number;
}) {
  return {
    currentHp: args.health.currentHp,
    maxHp: args.health.maxHp,
    hpPercent: args.health.maxHp > 0 ? args.health.currentHp / args.health.maxHp : 0,
    shield: args.health.shield,
    shieldMax: args.health.shieldMax,
    dangerLevel: getDangerLevel(args.health.currentHp, args.health.maxHp),
    nextEnemyDamage: args.nextEnemyDamage,
    enemyIntentShotsRemaining: args.enemyIntentShotsRemaining,
    overflowWarning: args.overflowWarning,
    predictedOverflowDamage: args.predictedOverflowDamage,
    reviveAvailable: canManualRevive(args.health, "PLAYER_HP_ZERO"),
  } satisfies PlayerSurvivalUiSnapshot;
}
