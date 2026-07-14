import rawPressureOverflowConfig from "../configs/combat/pressure_overflow.json" with { type: "json" };

export type BubbleRemovalSource =
  | "PLAYER_MATCH_CLEAR"
  | "PLAYER_SPECIAL_CLEAR"
  | "PLAYER_CAUSED_DROP"
  | "PRESSURE_OVERFLOW"
  | "OVERFLOW_SECONDARY_DETACH"
  | "ENEMY_EFFECT"
  | "SCRIPTED_REMOVE";

export type BubbleDestroyContext = {
  source: BubbleRemovalSource;
  grantRewards: boolean;
  damageEnemy: boolean;
  damagePlayer: boolean;
  triggerClearEffects: boolean;
  triggerDropEffects: boolean;
  triggerSpecialEffects: boolean;
  triggerRelics: boolean;
  triggerSkills: boolean;
  countForCombo: boolean;
  countForMission: boolean;
  playDropAnimation: boolean;
  playDestroyAnimation: boolean;
};

export type PressureBubbleKind = "NORMAL" | "STONE" | "CHAIN" | "WEB" | "POISON" | "LAVA" | "BOSS_CORE" | "COIN" | "CHEST" | "OTHER";

export type PressureBubble = {
  id: string;
  row: number;
  col?: number;
  color?: string;
  coin?: boolean;
  chest?: boolean;
  chain?: boolean;
  webbed?: boolean;
  poison?: boolean;
  core?: boolean;
  removed?: boolean;
  destroyed?: boolean;
};

type RemovalRuleConfig = {
  damageEnemy: boolean;
  grantRewards: boolean;
  triggerClearEffects: boolean;
  triggerDropEffects: boolean;
  triggerSpecialEffects: boolean;
  triggerRelics: boolean;
  triggerSkills: boolean;
  countForCombo: boolean;
  countForMission: boolean;
  damagePlayer?: boolean;
};

export type PressureOverflowConfig = {
  enabled: boolean;
  spawnRowBeforeBoardDrop: boolean;
  boardDropRows: number;
  damage: {
    baseDamage: number;
    damagePerWeight: number;
    repeatDamageIncrease: number;
    repeatDamageMaxMultiplier: number;
    canBeBlockedByShield: boolean;
  };
  bubbleWeights: Record<PressureBubbleKind, number>;
  directImpacted: RemovalRuleConfig & { destroyAfterDamage: boolean };
  secondaryDetached: RemovalRuleConfig & { destroyAfterDropAnimation: boolean; damagePlayer: boolean };
  state: {
    resetComboAfterOverflow: boolean;
    resetPressureAfterResolve: boolean;
    increaseOverflowCountOnlyWhenImpacted: boolean;
  };
  statusRules: {
    POISON: { enabled: boolean; applyOncePerResolve: boolean; statusId: string; baseStack: number };
    LAVA: { enabled: boolean; applyOncePerResolve: boolean; statusId: string; baseStack: number };
  };
  fallback: { unknownBubbleWeight: number; forceRemoveUnknownOverflowBubble: boolean };
};

export type PressureOverflowDamage = {
  bubbleTypeCounts: Record<PressureBubbleKind, number>;
  overflowWeight: number;
  rawDamage: number;
  repeatMultiplier: number;
  damageBeforeCap: number;
  cappedDamage: number;
  finalDamage: number;
  statusIds: string[];
};

export type PressureOverflowResult = PressureOverflowDamage & {
  battleId: string;
  resolveId: string;
  impactedBubbleIds: string[];
  secondaryDetachedBubbleIds: string[];
  lostCoinBubbleCount: number;
  lostChestBubbleCount: number;
  overflowCountAfterResolve: number;
  shieldDamage: number;
  hpDamage: number;
  playerDownedAfterResolve: boolean;
  duplicate: boolean;
  events: string[];
};

export type PressureOverflowBoardResolution<T extends PressureBubble> = {
  board: T[];
  impacted: T[];
  secondaryDetached: T[];
  result: PressureOverflowResult;
  processedResolveIds: Set<string>;
  directContext: BubbleDestroyContext;
  secondaryContext: BubbleDestroyContext;
};

export const playerBubbleDestroyContexts = {
  PLAYER_MATCH_CLEAR: {
    source: "PLAYER_MATCH_CLEAR", grantRewards: true, damageEnemy: true, damagePlayer: false,
    triggerClearEffects: true, triggerDropEffects: false, triggerSpecialEffects: true, triggerRelics: true,
    triggerSkills: true, countForCombo: true, countForMission: true, playDropAnimation: false, playDestroyAnimation: true,
  },
  PLAYER_CAUSED_DROP: {
    source: "PLAYER_CAUSED_DROP", grantRewards: true, damageEnemy: true, damagePlayer: false,
    triggerClearEffects: false, triggerDropEffects: true, triggerSpecialEffects: true, triggerRelics: true,
    triggerSkills: true, countForCombo: true, countForMission: true, playDropAnimation: true, playDestroyAnimation: false,
  },
} satisfies Record<"PLAYER_MATCH_CLEAR" | "PLAYER_CAUSED_DROP", BubbleDestroyContext>;

const pressureEventOrder = [
  "PRESSURE_RESOLVE_STARTED",
  "PRESSURE_BOARD_DROPPED",
  "PRESSURE_OVERFLOW_DETECTED",
  "PRESSURE_OVERFLOW_DAMAGE_CALCULATED",
  "PRESSURE_OVERFLOW_DAMAGE_APPLIED",
  "PRESSURE_IMPACTED_BUBBLES_REMOVED",
  "PRESSURE_SECONDARY_DETACH_STARTED",
  "PRESSURE_SECONDARY_DETACH_COMPLETED",
  "PRESSURE_OVERFLOW_RESOLVED",
] as const;

const requiredKinds: PressureBubbleKind[] = ["NORMAL", "STONE", "CHAIN", "WEB", "POISON", "LAVA", "BOSS_CORE", "COIN", "CHEST", "OTHER"];

function finiteNumber(value: unknown, fallback: number, label: string, warnings: string[]) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  warnings.push(`${label} 配置无效，已回退到 ${fallback}`);
  return fallback;
}

export function loadPressureOverflowConfig(
  value: unknown = rawPressureOverflowConfig,
  override?: Partial<Pick<PressureOverflowConfig, "boardDropRows">> & { repeatDamageIncrease?: number },
) {
  const source = value as Partial<PressureOverflowConfig>;
  const defaults = rawPressureOverflowConfig as PressureOverflowConfig;
  const warnings: string[] = [];
  const sourceDamage = source.damage ?? defaults.damage;
  const sourceWeights = source.bubbleWeights ?? defaults.bubbleWeights;
  const bubbleWeights = Object.fromEntries(requiredKinds.map((kind) => [
    kind,
    finiteNumber(sourceWeights[kind], defaults.bubbleWeights[kind], `bubbleWeights.${kind}`, warnings),
  ])) as Record<PressureBubbleKind, number>;
  const config: PressureOverflowConfig = {
    ...defaults,
    ...source,
    boardDropRows: finiteNumber(override?.boardDropRows ?? source.boardDropRows, defaults.boardDropRows, "boardDropRows", warnings),
    damage: {
      ...defaults.damage,
      ...sourceDamage,
      baseDamage: finiteNumber(sourceDamage.baseDamage, defaults.damage.baseDamage, "damage.baseDamage", warnings),
      damagePerWeight: finiteNumber(sourceDamage.damagePerWeight, defaults.damage.damagePerWeight, "damage.damagePerWeight", warnings),
      repeatDamageIncrease: finiteNumber(override?.repeatDamageIncrease ?? sourceDamage.repeatDamageIncrease, defaults.damage.repeatDamageIncrease, "damage.repeatDamageIncrease", warnings),
      repeatDamageMaxMultiplier: finiteNumber(sourceDamage.repeatDamageMaxMultiplier, defaults.damage.repeatDamageMaxMultiplier, "damage.repeatDamageMaxMultiplier", warnings),
    },
    bubbleWeights,
    directImpacted: { ...defaults.directImpacted, ...(source.directImpacted ?? {}) },
    secondaryDetached: { ...defaults.secondaryDetached, ...(source.secondaryDetached ?? {}) },
    state: { ...defaults.state, ...(source.state ?? {}) },
    statusRules: {
      POISON: { ...defaults.statusRules.POISON, ...(source.statusRules?.POISON ?? {}) },
      LAVA: { ...defaults.statusRules.LAVA, ...(source.statusRules?.LAVA ?? {}) },
    },
    fallback: { ...defaults.fallback, ...(source.fallback ?? {}) },
  };
  return { config, warnings };
}

export const pressureOverflowConfig = loadPressureOverflowConfig().config;

export function getPressureBubbleKind(bubble: PressureBubble): PressureBubbleKind {
  if (bubble.coin) return "COIN";
  if (bubble.chest) return "CHEST";
  if (bubble.core) return "BOSS_CORE";
  if (bubble.poison) return "POISON";
  if (bubble.color === "lava") return "LAVA";
  if (bubble.color === "stone") return "STONE";
  if (bubble.chain) return "CHAIN";
  if (bubble.webbed) return "WEB";
  if (["red", "blue", "yellow", "green", "egg"].includes(bubble.color ?? "")) return "NORMAL";
  return "OTHER";
}

export function getPressureBubbleWeight(bubble: PressureBubble, config = pressureOverflowConfig) {
  const kind = getPressureBubbleKind(bubble);
  return config.bubbleWeights[kind] ?? config.fallback.unknownBubbleWeight;
}

export function collectImpactedBubbles<T extends PressureBubble>(bubbles: T[], collapseRow: number) {
  const seen = new Set<string>();
  return bubbles
    .filter((bubble) => bubble.row > collapseRow && !bubble.removed && !bubble.destroyed && !seen.has(bubble.id) && seen.add(bubble.id))
    .sort((a, b) => a.row - b.row || (a.col ?? 0) - (b.col ?? 0) || a.id.localeCompare(b.id));
}

export function calculateOverflowDamage(args: {
  bubbles: PressureBubble[];
  overflowCountBeforeResolve: number;
  damageCap: number;
  config?: PressureOverflowConfig;
  incomingMultiplier?: number;
  flatReduction?: number;
}): PressureOverflowDamage {
  const config = args.config ?? pressureOverflowConfig;
  const bubbleTypeCounts = Object.fromEntries(requiredKinds.map((kind) => [kind, 0])) as Record<PressureBubbleKind, number>;
  args.bubbles.forEach((bubble) => { bubbleTypeCounts[getPressureBubbleKind(bubble)] += 1; });
  if (!args.bubbles.length) {
    return { bubbleTypeCounts, overflowWeight: 0, rawDamage: 0, repeatMultiplier: 1, damageBeforeCap: 0, cappedDamage: 0, finalDamage: 0, statusIds: [] };
  }
  const overflowWeight = args.bubbles.reduce((sum, bubble) => sum + getPressureBubbleWeight(bubble, config), 0);
  const repeatMultiplier = Math.min(
    1 + Math.max(0, args.overflowCountBeforeResolve) * config.damage.repeatDamageIncrease,
    config.damage.repeatDamageMaxMultiplier,
  );
  const rawDamage = config.damage.baseDamage + overflowWeight * config.damage.damagePerWeight;
  const damageBeforeCap = Math.ceil(rawDamage * repeatMultiplier);
  const cappedDamage = Math.min(damageBeforeCap, Math.max(0, args.damageCap));
  const finalDamage = Math.max(0, Math.ceil(cappedDamage * (args.incomingMultiplier ?? 1) - (args.flatReduction ?? 0)));
  const statusIds: string[] = [];
  if (bubbleTypeCounts.POISON > 0 && config.statusRules.POISON.enabled) statusIds.push(config.statusRules.POISON.statusId);
  if (bubbleTypeCounts.LAVA > 0 && config.statusRules.LAVA.enabled) statusIds.push(config.statusRules.LAVA.statusId);
  return { bubbleTypeCounts, overflowWeight, rawDamage, repeatMultiplier, damageBeforeCap, cappedDamage, finalDamage, statusIds };
}

function removalContext(source: "PRESSURE_OVERFLOW" | "OVERFLOW_SECONDARY_DETACH", rules: RemovalRuleConfig): BubbleDestroyContext {
  return {
    source,
    grantRewards: rules.grantRewards,
    damageEnemy: rules.damageEnemy,
    damagePlayer: rules.damagePlayer ?? false,
    triggerClearEffects: rules.triggerClearEffects,
    triggerDropEffects: rules.triggerDropEffects,
    triggerSpecialEffects: rules.triggerSpecialEffects,
    triggerRelics: rules.triggerRelics,
    triggerSkills: rules.triggerSkills,
    countForCombo: rules.countForCombo,
    countForMission: rules.countForMission,
    playDropAnimation: source === "OVERFLOW_SECONDARY_DETACH",
    playDestroyAnimation: source === "PRESSURE_OVERFLOW",
  };
}

export function resolvePressureOverflowBoard<T extends PressureBubble>(args: {
  battleId: string;
  resolveId: string;
  boardAfterDrop: T[];
  collapseRow: number;
  overflowCountBeforeResolve: number;
  damageCap: number;
  processedResolveIds?: ReadonlySet<string>;
  findDetached: (remaining: T[]) => { kept: T[]; dropped: T[] };
  config?: PressureOverflowConfig;
}): PressureOverflowBoardResolution<T> {
  const config = args.config ?? pressureOverflowConfig;
  const processedResolveIds = new Set(args.processedResolveIds ?? []);
  const duplicate = processedResolveIds.has(args.resolveId);
  const directContext = removalContext("PRESSURE_OVERFLOW", config.directImpacted);
  const secondaryContext = removalContext("OVERFLOW_SECONDARY_DETACH", config.secondaryDetached);
  const emptyDamage = calculateOverflowDamage({ bubbles: [], overflowCountBeforeResolve: args.overflowCountBeforeResolve, damageCap: args.damageCap, config });
  if (duplicate) {
    return {
      board: args.boardAfterDrop,
      impacted: [],
      secondaryDetached: [],
      processedResolveIds,
      directContext,
      secondaryContext,
      result: {
        ...emptyDamage, battleId: args.battleId, resolveId: args.resolveId, impactedBubbleIds: [], secondaryDetachedBubbleIds: [],
        lostCoinBubbleCount: 0, lostChestBubbleCount: 0, overflowCountAfterResolve: args.overflowCountBeforeResolve,
        shieldDamage: 0, hpDamage: 0, playerDownedAfterResolve: false, duplicate: true, events: [],
      },
    };
  }

  processedResolveIds.add(args.resolveId);
  const impacted = collectImpactedBubbles(args.boardAfterDrop, args.collapseRow);
  const impactedIds = new Set(impacted.map((bubble) => bubble.id));
  const remaining = args.boardAfterDrop.filter((bubble) => !impactedIds.has(bubble.id));
  const detached = impacted.length ? args.findDetached(remaining) : { kept: remaining, dropped: [] as T[] };
  const damage = calculateOverflowDamage({ bubbles: impacted, overflowCountBeforeResolve: args.overflowCountBeforeResolve, damageCap: args.damageCap, config });
  const events = impacted.length
    ? [...pressureEventOrder]
    : ["PRESSURE_RESOLVE_STARTED", "PRESSURE_BOARD_DROPPED", "PRESSURE_OVERFLOW_RESOLVED"];
  return {
    board: detached.kept,
    impacted,
    secondaryDetached: detached.dropped,
    processedResolveIds,
    directContext,
    secondaryContext,
    result: {
      ...damage,
      battleId: args.battleId,
      resolveId: args.resolveId,
      impactedBubbleIds: impacted.map((bubble) => bubble.id),
      secondaryDetachedBubbleIds: detached.dropped.map((bubble) => bubble.id),
      lostCoinBubbleCount: impacted.filter((bubble) => bubble.coin).length + detached.dropped.filter((bubble) => bubble.coin).length,
      lostChestBubbleCount: impacted.filter((bubble) => bubble.chest).length + detached.dropped.filter((bubble) => bubble.chest).length,
      overflowCountAfterResolve: args.overflowCountBeforeResolve + (impacted.length ? 1 : 0),
      shieldDamage: 0,
      hpDamage: 0,
      playerDownedAfterResolve: false,
      duplicate: false,
      events,
    },
  };
}

export function completePressureOverflowResult(
  result: PressureOverflowResult,
  damage: { shieldDamage: number; hpDamage: number; causedDowned: boolean },
): PressureOverflowResult {
  return { ...result, shieldDamage: damage.shieldDamage, hpDamage: damage.hpDamage, playerDownedAfterResolve: damage.causedDowned };
}

export function createPressureOverflowTelemetry(result: PressureOverflowResult, levelId: string) {
  return {
    event: "pressure_overflow_resolved",
    battle_id: result.battleId,
    level_id: levelId,
    resolve_id: result.resolveId,
    overflow_count_in_battle: result.overflowCountAfterResolve,
    impacted_count: result.impactedBubbleIds.length,
    secondary_detached_count: result.secondaryDetachedBubbleIds.length,
    overflow_weight: result.overflowWeight,
    raw_damage: result.rawDamage,
    final_damage: result.finalDamage,
    shield_damage: result.shieldDamage,
    hp_damage: result.hpDamage,
    lost_coin_count: result.lostCoinBubbleCount,
    lost_chest_count: result.lostChestBubbleCount,
    player_downed: result.playerDownedAfterResolve,
  };
}
