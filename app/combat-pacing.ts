import chapterEnemyData from "../configs/combat/chapter_1_enemy_hp.json" with { type: "json" };
import combatPacingData from "../configs/combat/combat_pacing.json" with { type: "json" };
import bossPhaseData from "../configs/combat/boss_phase_rules.json" with { type: "json" };
import { enemyConfig, statusCoreConfig, type Effect } from "./core-content.ts";

export type NodeType = "NORMAL" | "ELITE" | "BOSS";
export type HpProfileVersion = "legacy" | "v1";
export type CombatPacingRange = { min: number; max: number };
export type EnemyIntentActionType = "ATTACK_PLAYER" | "SPAWN_BUBBLE" | "ADD_MODIFIER" | "RESTORE_SHIELD" | "LOCK_RESERVE" | "TICK_OBJECT" | "COMPOSITE";
export type EnemyDamageSource = "MATCH_CLEAR" | "BUBBLE_DROP" | "SPECIAL_BALL" | "RELIC" | "SKILL" | "STATUS";

export type EnemyIntentActionConfig = {
  actionId: string;
  actionType: EnemyIntentActionType;
  displayName?: string;
  value?: number;
  count?: number;
  maxTriggerCount?: number;
  params?: Record<string, unknown>;
  effects?: Effect[];
};

export type EnemyHpConfig = {
  levelId: string;
  nodeType: NodeType;
  enemyId: string;
  hp: number;
  shield: number;
  legacyHp: number;
  legacyShield?: number;
  displayMaxHp?: number;
  initialBoardBubbleCount?: number;
  boardDamageBudgetRatio?: number;
  targetShotsMin: number;
  targetShotsMax: number;
  expectedEffectiveDamagePerShot: number;
  targetDurationSec: CombatPacingRange;
  intentIntervalShots: number;
  intentCycle: EnemyIntentActionConfig[];
  pressureMax?: number;
  intentLoopIndexes?: number[];
  boardDifficultyModifier?: number;
  shieldDropDamageReduction?: number;
  mirrorSpecialDamageReduction?: number;
  shieldBreakVulnerableShots?: number;
  shieldBreakVulnerableMultiplier?: number;
};

export type BossPhaseConfig = {
  phaseId: string;
  hp: number;
  shield: number;
  targetShotsMin: number;
  targetShotsMax: number;
  intentIntervalShots: number;
  pressureMax: number;
  intentCycle: EnemyIntentActionConfig[];
};

export type BossHpConfig = {
  levelId: string;
  nodeType: "BOSS";
  bossId: string;
  totalHp: number;
  totalShield: number;
  targetShotsMin: number;
  targetShotsMax: number;
  expectedEffectiveDamagePerShot: number;
  targetDurationSec: CombatPacingRange;
  phaseGateEnabled: boolean;
  overkillCarryRate: number;
  transitionDurationMs: number;
  phases: BossPhaseConfig[];
};

export type EnemyPhaseState = { phaseId: string; hp: number; maxHp: number; shield: number; maxShield: number };

export type EnemyCombatState = {
  levelId: string;
  enemyId: string;
  nodeType: NodeType;
  profileVersion: HpProfileVersion;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  phaseIndex: number;
  phases: EnemyPhaseState[];
  vulnerableShots: number;
  shieldBroken: boolean;
  shieldRestoreUsed: boolean;
  defeated: boolean;
};

export type EnemyShotDamageResult = {
  state: EnemyCombatState;
  rawDamage: number;
  modifiedDamage: number;
  shieldDamage: number;
  hpDamage: number;
  actualDamage: number;
  overkillDamage: number;
  carryDamage: number;
  shieldBroken: boolean;
  phaseChanged: boolean;
  fromPhase: number;
  toPhase: number;
  damageBySource: Record<EnemyDamageSource, number>;
  defeated: boolean;
};

export type BattleTelemetry = {
  levelId: string;
  enemyId: string;
  nodeType: NodeType;
  hpProfileVersion: HpProfileVersion;
  controlGrantedAtMs: number;
  finishedAtMs?: number;
  shotsFired: number;
  shotsMissed: number;
  shotConfirmedAtMs: number[];
  damageBySource: Record<EnemyDamageSource, number>;
  totalDamage: number;
  highestSingleShotDamage: number;
  overkillDamage: number;
  initialEnemyHp: number;
  initialEnemyShield: number;
  enemyIntentCount: number;
  enemyAttackCount: number;
  pressureTriggerCount: number;
  overflowCount: number;
  bossPhaseReached: number;
  bossPhaseTransitionCount: number;
  playerHpAtStart: number;
  playerDamageTaken: number;
  ballBagSize: number;
  specialBallCount: number;
  relicCount: number;
};

export type CombatTelemetrySnapshot = {
  level_id: string;
  enemy_id: string;
  node_type: NodeType;
  hp_profile_version: HpProfileVersion;
  combat_duration_sec: number;
  shots_fired: number;
  shots_missed: number;
  median_shot_cycle_sec: number;
  clear_damage: number;
  drop_damage: number;
  special_ball_damage: number;
  relic_damage: number;
  skill_damage: number;
  status_damage: number;
  total_damage: number;
  effective_damage_per_shot: number;
  highest_single_shot_damage: number;
  overkill_damage: number;
  initial_enemy_hp: number;
  initial_enemy_shield: number;
  remaining_enemy_hp: number;
  remaining_enemy_shield: number;
  boss_phase_reached: number;
  boss_phase_transition_count: number;
  enemy_intent_count: number;
  enemy_attack_count: number;
  pressure_trigger_count: number;
  overflow_count: number;
  player_hp_at_start: number;
  player_hp_at_end: number;
  player_damage_taken: number;
  battle_result: string;
  ball_bag_size: number;
  special_ball_count: number;
  relic_count: number;
};

const pacingLevels = (chapterEnemyData as { levels: EnemyHpConfig[] }).levels;

function toRuntimeIntent(intent: { intentId: string; displayName: string; effects: Effect[]; limits?: Record<string, number> }): EnemyIntentActionConfig {
  const effects = intent.effects.map((effect) => ({ ...effect }));
  const damage = effects.find((effect) => effect.effectType === "DAMAGE_PLAYER");
  const spawn = effects.find((effect) => effect.effectType === "SPAWN_BOARD_BUBBLE" || effect.effectType === "SPAWN_COLORED_BUBBLES");
  const modifier = effects.find((effect) => effect.effectType === "ADD_BOARD_MODIFIER" || effect.effectType === "ADD_BOARD_TAG" || effect.effectType === "TRANSFORM_BOARD_BUBBLE" || effect.effectType === "SPREAD_BOARD_BUBBLE_TYPE");
  const shield = effects.find((effect) => effect.effectType === "RESTORE_ENEMY_SHIELD");
  const reserveLock = effects.find((effect) => effect.effectType === "ADD_STATUS_TO_PLAYER" && effect.statusId === "STATUS_RESERVE_LOCK");
  const actionType: EnemyIntentActionType = effects.length > 1
    ? "COMPOSITE"
    : damage ? "ATTACK_PLAYER"
      : shield ? "RESTORE_SHIELD"
        : reserveLock ? "LOCK_RESERVE"
          : spawn ? "SPAWN_BUBBLE"
            : modifier ? "ADD_MODIFIER"
              : "TICK_OBJECT";
  const primary = damage ?? shield ?? reserveLock ?? spawn ?? modifier ?? effects[0];
  const bubbleId = String(spawn?.bubbleId ?? modifier?.toBubbleId ?? modifier?.sourceBubbleId ?? "");
  const kind = spawn?.effectType === "SPAWN_COLORED_BUBBLES" ? "NORMAL"
    : modifier?.effectType === "ADD_BOARD_TAG" ? "SLIME"
      : modifier?.effectType === "ADD_BOARD_MODIFIER" ? String(modifier.modifierId ?? "").replace("MOD_", "")
        : modifier?.effectType === "TRANSFORM_BOARD_BUBBLE" ? "POISON"
          : modifier?.effectType === "SPREAD_BOARD_BUBBLE_TYPE" ? "POISON_STRENGTHEN"
            : bubbleId.replace("BUBBLE_", "").replace("SPIDER_", "");
  return {
    actionId: intent.intentId,
    displayName: intent.displayName,
    actionType,
    value: Number(primary?.value ?? primary?.durationPlayerShots ?? 0) || undefined,
    count: Number(primary?.count ?? 0) || undefined,
    maxTriggerCount: intent.limits?.maxUsesPerBattle,
    params: {
      kind,
      targetRule: primary?.targetRule,
      positionRule: primary?.positionRule,
      bubbleId: spawn?.bubbleId,
      statusId: reserveLock?.statusId,
    },
    effects,
  };
}

const canonicalByLevel = new Map<string, (typeof enemyConfig.chapter1NormalEnemies)[number] | (typeof enemyConfig.chapter1ElitePool)[number]>();
enemyConfig.chapter1NormalEnemies.forEach((enemy) => {
  if (enemy.defaultLevelId) canonicalByLevel.set(enemy.defaultLevelId, enemy);
});
canonicalByLevel.set("CH1_05", enemyConfig.chapter1ElitePool.find((enemy) => enemy.enemyId === "ELITE_STONE_COLOSSUS")!);

const rawLevels: EnemyHpConfig[] = pacingLevels.map((pacing) => {
  if (pacing.levelId === "CH1_10") {
    const boss = enemyConfig.chapter1Bosses[0];
    return { ...pacing, enemyId: boss.bossId, hp: boss.totalHp, shield: boss.totalShield, intentCycle: [] };
  }
  const enemy = canonicalByLevel.get(pacing.levelId);
  if (!enemy) return pacing;
  return {
    ...pacing,
    enemyId: enemy.enemyId,
    hp: enemy.hp,
    shield: enemy.shield,
    pressureMax: enemy.pressureMax,
    intentIntervalShots: enemy.intentIntervalShots,
    intentCycle: enemy.intentCycle.map(toRuntimeIntent),
    intentLoopIndexes: enemy.enemyId === "ELITE_STONE_COLOSSUS" ? [0, 1, 3] : undefined,
    shieldDropDamageReduction: enemy.enemyId === "ENEMY_STONE_GUARD" || enemy.enemyId === "ELITE_STONE_COLOSSUS" ? .2 : pacing.shieldDropDamageReduction,
    shieldBreakVulnerableShots: enemy.enemyId === "ENEMY_STONE_GUARD" ? 1 : pacing.shieldBreakVulnerableShots,
    shieldBreakVulnerableMultiplier: enemy.enemyId === "ENEMY_STONE_GUARD" ? Number(statusCoreConfig.damage.bossVulnerableMultiplier) : pacing.shieldBreakVulnerableMultiplier,
    mirrorSpecialDamageReduction: enemy.enemyId === "ENEMY_MIRROR_GHOST" ? .2 : pacing.mirrorSpecialDamageReduction,
  };
});
export const combatPacingConfig = combatPacingData as {
  expectedShotCycleSec: number;
  normalTargetDurationSec: CombatPacingRange;
  eliteTargetDurationSec: CombatPacingRange;
  bossTargetDurationSec: CombatPacingRange;
  runPowerHpMultiplier: { enabled: boolean; min: number; max: number };
  calibration: { increaseCap: number; decreaseCap: number; minimumProductionSamples: number };
};
const bossPacing = bossPhaseData as BossHpConfig;
const canonicalBoss = enemyConfig.chapter1Bosses[0];
export const spiderQueenBossConfig: BossHpConfig = {
  ...bossPacing,
  bossId: canonicalBoss.bossId,
  totalHp: canonicalBoss.totalHp,
  totalShield: canonicalBoss.totalShield,
  phaseGateEnabled: canonicalBoss.phaseGate.enabled,
  overkillCarryRate: canonicalBoss.phaseGate.overkillCarryRate,
  phases: canonicalBoss.phases.map((phase, index) => ({
    phaseId: phase.phaseId,
    hp: phase.hp,
    shield: phase.shield,
    targetShotsMin: bossPacing.phases[index]?.targetShotsMin ?? 1,
    targetShotsMax: bossPacing.phases[index]?.targetShotsMax ?? 1,
    intentIntervalShots: phase.intentIntervalShots,
    pressureMax: phase.pressureMax,
    intentCycle: phase.intentCycle.map(toRuntimeIntent),
  })),
};

const emptyDamageBySource = (): Record<EnemyDamageSource, number> => ({
  MATCH_CLEAR: 0,
  BUBBLE_DROP: 0,
  SPECIAL_BALL: 0,
  RELIC: 0,
  SKILL: 0,
  STATUS: 0,
});

export function validateCombatConfigs(levels: EnemyHpConfig[] = rawLevels, boss: BossHpConfig = spiderQueenBossConfig) {
  const errors: string[] = [];
  levels.forEach((config) => {
    if (!(config.hp > 0)) errors.push(`${config.levelId}.hp 必须大于 0`);
    if (config.shield < 0) errors.push(`${config.levelId}.shield 不能为负数`);
    if (!(config.intentIntervalShots > 0)) errors.push(`${config.levelId}.intentIntervalShots 必须大于 0`);
    if (config.targetShotsMin > config.targetShotsMax) errors.push(`${config.levelId} 目标发射区间无效`);
    if (config.intentLoopIndexes?.some((index) => index < 0 || index >= config.intentCycle.length)) errors.push(`${config.levelId}.intentLoopIndexes 存在越界索引`);
  });
  if (boss.phases.reduce((sum, phase) => sum + phase.hp, 0) !== boss.totalHp) errors.push("Boss 阶段 HP 总和必须等于 totalHp");
  if (boss.phases.reduce((sum, phase) => sum + phase.shield, 0) !== boss.totalShield) errors.push("Boss 阶段护盾总和必须等于 totalShield");
  boss.phases.forEach((phase) => {
    if (!(phase.hp > 0)) errors.push(`${phase.phaseId}.hp 必须大于 0`);
    if (phase.shield < 0) errors.push(`${phase.phaseId}.shield 不能为负数`);
    if (!(phase.intentIntervalShots > 0)) errors.push(`${phase.phaseId}.intentIntervalShots 必须大于 0`);
  });
  return errors;
}

const initialErrors = validateCombatConfigs();
if (initialErrors.length) throw new Error(`怪物战斗配置无效：${initialErrors.join("；")}`);

export function getEnemyHpConfig(levelId: string, profile: HpProfileVersion = "v1", enemyOverrideId?: string): EnemyHpConfig {
  const config = rawLevels.find((item) => item.levelId === levelId);
  if (!config) throw new Error(`未找到敌人血量配置：${levelId}`);
  const override = enemyOverrideId && enemyOverrideId !== config.enemyId
    ? [...enemyConfig.chapter1NormalEnemies, ...enemyConfig.chapter1ElitePool].find((enemy) => enemy.enemyId === enemyOverrideId)
    : undefined;
  const selected: EnemyHpConfig = override ? {
    ...config,
    nodeType: override.enemyType,
    enemyId: override.enemyId,
    hp: override.hp,
    shield: override.shield,
    pressureMax: override.pressureMax,
    intentIntervalShots: override.intentIntervalShots,
    intentCycle: override.intentCycle.map(toRuntimeIntent),
    intentLoopIndexes: override.enemyId === "ELITE_STONE_COLOSSUS" ? [0, 1, 3] : undefined,
    shieldDropDamageReduction: override.enemyId === "ENEMY_STONE_GUARD" || override.enemyId === "ELITE_STONE_COLOSSUS" ? .2 : undefined,
    shieldBreakVulnerableShots: override.enemyId === "ENEMY_STONE_GUARD" ? 1 : undefined,
    shieldBreakVulnerableMultiplier: override.enemyId === "ENEMY_STONE_GUARD" ? Number(statusCoreConfig.damage.bossVulnerableMultiplier) : undefined,
    mirrorSpecialDamageReduction: override.enemyId === "ENEMY_MIRROR_GHOST" ? .2 : undefined,
  } : config;
  if (profile === "v1" || override) return { ...selected, intentCycle: selected.intentCycle.map((action) => ({ ...action, effects: action.effects?.map((effect) => ({ ...effect })) })) };
  return {
    ...selected,
    hp: selected.legacyHp,
    shield: selected.legacyShield ?? 0,
    displayMaxHp: selected.legacyHp,
    targetShotsMin: 1,
    targetShotsMax: Math.max(1, Math.round(selected.legacyHp / selected.expectedEffectiveDamagePerShot)),
    targetDurationSec: { min: 0, max: 60 },
  };
}

export function getEnemyDisplayDurability(state: EnemyCombatState) {
  const config = getEnemyHpConfig(state.levelId, state.profileVersion, state.enemyId);
  const baseDisplayMaxHp = config.displayMaxHp ?? config.hp;
  const internalHpScale = baseDisplayMaxHp / Math.max(1, config.hp);
  const maxHp = baseDisplayMaxHp * state.maxHp / Math.max(1, config.hp);
  return {
    hp: state.maxHp > 0 ? maxHp * state.hp / state.maxHp : 0,
    maxHp,
    shield: state.shield * internalHpScale,
    maxShield: state.maxShield * internalHpScale,
    internalHp: state.hp,
    internalMaxHp: state.maxHp,
  };
}

export function getEnemyDisplayDamage(state: EnemyCombatState, internalDamage: number) {
  const config = getEnemyHpConfig(state.levelId, state.profileVersion, state.enemyId);
  return Math.max(0, internalDamage) * (config.displayMaxHp ?? config.hp) / Math.max(1, config.hp);
}

export function formatEnemyDisplayValue(value: number) {
  const rounded = Math.round(Math.max(0, value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function legacyBossPhases(totalHp: number): BossPhaseConfig[] {
  const p1 = Math.floor(totalHp * 220 / 720);
  const p2 = Math.floor(totalHp * 240 / 720);
  const hp = [p1, p2, totalHp - p1 - p2];
  return spiderQueenBossConfig.phases.map((phase, index) => ({ ...phase, hp: hp[index], shield: 0 }));
}

export function getBossHpConfig(profile: HpProfileVersion = "v1"): BossHpConfig {
  if (profile === "v1") return { ...spiderQueenBossConfig, phases: spiderQueenBossConfig.phases.map((phase) => ({ ...phase, intentCycle: phase.intentCycle.map((action) => ({ ...action })) })) };
  const level = getEnemyHpConfig("CH1_10", "legacy");
  return { ...spiderQueenBossConfig, totalHp: level.hp, totalShield: 0, phases: legacyBossPhases(level.hp) };
}

export function createEnemyCombatState(levelId: string, profile: HpProfileVersion = "v1", enemyOverrideId?: string): EnemyCombatState {
  const config = getEnemyHpConfig(levelId, profile, enemyOverrideId);
  if (config.nodeType !== "BOSS") {
    return {
      levelId, enemyId: config.enemyId, nodeType: config.nodeType, profileVersion: profile,
      hp: config.hp, maxHp: config.hp, shield: config.shield, maxShield: config.shield,
      phaseIndex: 0, phases: [], vulnerableShots: 0, shieldBroken: config.shield <= 0,
      shieldRestoreUsed: false, defeated: false,
    };
  }
  const boss = getBossHpConfig(profile);
  const phases = boss.phases.map((phase) => ({ phaseId: phase.phaseId, hp: phase.hp, maxHp: phase.hp, shield: phase.shield, maxShield: phase.shield }));
  return {
    levelId, enemyId: config.enemyId, nodeType: "BOSS", profileVersion: profile,
    hp: boss.totalHp, maxHp: boss.totalHp, shield: phases[0].shield, maxShield: phases[0].maxShield,
    phaseIndex: 0, phases, vulnerableShots: 0, shieldBroken: phases[0].shield <= 0,
    shieldRestoreUsed: false, defeated: false,
  };
}

export function restoreEnemyCombatState(saved: Partial<EnemyCombatState> | undefined, levelId: string, profile: HpProfileVersion) {
  const fresh = createEnemyCombatState(levelId, profile, saved?.enemyId);
  if (!saved || saved.levelId !== levelId || saved.profileVersion !== profile) return fresh;
  if (saved.maxHp !== fresh.maxHp || saved.maxShield !== fresh.maxShield) return fresh;
  return {
    ...fresh,
    ...saved,
    phases: Array.isArray(saved.phases) ? saved.phases.map((phase) => ({ ...phase })) : fresh.phases,
  } as EnemyCombatState;
}

export function getActiveBossPhaseConfig(state: EnemyCombatState) {
  if (state.nodeType !== "BOSS") return null;
  return getBossHpConfig(state.profileVersion).phases[state.phaseIndex] ?? null;
}

export function getIntentCycle(state: EnemyCombatState) {
  return getActiveBossPhaseConfig(state)?.intentCycle ?? getEnemyHpConfig(state.levelId, state.profileVersion, state.enemyId).intentCycle;
}

export function getIntentInterval(state: EnemyCombatState) {
  return getActiveBossPhaseConfig(state)?.intentIntervalShots ?? getEnemyHpConfig(state.levelId, state.profileVersion, state.enemyId).intentIntervalShots;
}

export function getIntentPreview(state: EnemyCombatState, phaseIntentCount: number, intentClock: number, delayShots = 0) {
  const cycle = getIntentCycle(state);
  const config = getEnemyHpConfig(state.levelId, state.profileVersion, state.enemyId);
  const loopIndexes = state.nodeType === "BOSS" ? undefined : config.intentLoopIndexes;
  const actionIndex = phaseIntentCount < cycle.length || !loopIndexes?.length
    ? phaseIntentCount % Math.max(1, cycle.length)
    : loopIndexes[(phaseIntentCount - cycle.length) % loopIndexes.length];
  const action = cycle.length ? cycle[actionIndex] : null;
  return { action, shotsRemaining: Math.max(1, getIntentInterval(state) - intentClock + delayShots) };
}

function distributeActualDamage(components: Array<{ sourceType: EnemyDamageSource; value: number }>, actual: number) {
  const result = emptyDamageBySource();
  const total = components.reduce((sum, item) => sum + item.value, 0);
  let remaining = actual;
  components.forEach((component, index) => {
    const allocated = index === components.length - 1 ? remaining : Math.min(remaining, Math.floor(actual * component.value / Math.max(1, total)));
    result[component.sourceType] += allocated;
    remaining -= allocated;
  });
  return result;
}

export function resolveEnemyShotDamage(state: EnemyCombatState, args: {
  components: Array<{ sourceType: EnemyDamageSource; rawDamage: number }>;
  vulnerabilityMultiplier?: number;
  specialDamageMultiplier?: number;
  shotDamageMultiplier?: number;
}): EnemyShotDamageResult {
  const config = getEnemyHpConfig(state.levelId, state.profileVersion, state.enemyId);
  const shieldAtStart = state.shield > 0;
  const stateVulnerability = state.vulnerableShots > 0 ? (config.shieldBreakVulnerableMultiplier ?? 1.2) : 1;
  const vulnerability = Math.max(1, args.vulnerabilityMultiplier ?? 1, stateVulnerability);
  const modifiedComponents = args.components.map((component) => {
    let value = Math.max(0, component.rawDamage);
    if (shieldAtStart && component.sourceType === "BUBBLE_DROP") value *= 1 - (config.shieldDropDamageReduction ?? 0);
    if (component.sourceType === "SPECIAL_BALL") value *= args.specialDamageMultiplier ?? 1;
    return { sourceType: component.sourceType, value: Math.ceil(value * vulnerability * (args.shotDamageMultiplier ?? 1)) };
  }).filter((component) => component.value > 0);
  const rawDamage = args.components.reduce((sum, component) => sum + Math.max(0, component.rawDamage), 0);
  const modifiedDamage = modifiedComponents.reduce((sum, component) => sum + component.value, 0);
  const next: EnemyCombatState = { ...state, phases: state.phases.map((phase) => ({ ...phase })) };
  const fromPhase = state.phaseIndex + 1;
  let remaining = modifiedDamage;
  let shieldDamage = 0;
  let hpDamage = 0;
  let overkillDamage = 0;
  let carryDamage = 0;
  let phaseChanged = false;

  if (state.nodeType !== "BOSS") {
    shieldDamage = Math.min(next.shield, remaining);
    next.shield -= shieldDamage;
    remaining -= shieldDamage;
    hpDamage = Math.min(next.hp, remaining);
    next.hp -= hpDamage;
    remaining -= hpDamage;
    overkillDamage = remaining;
    const shieldBroken = state.shield > 0 && next.shield <= 0;
    next.vulnerableShots = state.vulnerableShots > 0 ? state.vulnerableShots - 1 : 0;
    if (shieldBroken && (config.shieldBreakVulnerableShots ?? 0) > 0) next.vulnerableShots = config.shieldBreakVulnerableShots ?? 0;
    next.shieldBroken = next.shield <= 0;
    next.defeated = next.hp <= 0;
    const actualDamage = shieldDamage + hpDamage;
    return {
      state: next, rawDamage, modifiedDamage, shieldDamage, hpDamage, actualDamage, overkillDamage, carryDamage: 0,
      shieldBroken, phaseChanged: false, fromPhase, toPhase: fromPhase,
      damageBySource: distributeActualDamage(modifiedComponents, actualDamage), defeated: next.defeated,
    };
  }

  const current = next.phases[next.phaseIndex];
  const currentShieldDamage = Math.min(current.shield, remaining);
  current.shield -= currentShieldDamage;
  remaining -= currentShieldDamage;
  const currentHpDamage = Math.min(current.hp, remaining);
  current.hp -= currentHpDamage;
  remaining -= currentHpDamage;
  shieldDamage += currentShieldDamage;
  hpDamage += currentHpDamage;
  overkillDamage = remaining;

  if (current.hp <= 0 && next.phaseIndex < next.phases.length - 1) {
    phaseChanged = true;
    next.phaseIndex += 1;
    const incoming = next.phases[next.phaseIndex];
    const carryRequested = Math.floor(overkillDamage * getBossHpConfig(state.profileVersion).overkillCarryRate);
    const carryLimit = Math.max(0, incoming.hp + incoming.shield - 1);
    carryDamage = Math.min(carryRequested, carryLimit);
    let carryRemaining = carryDamage;
    const carryShield = Math.min(incoming.shield, carryRemaining);
    incoming.shield -= carryShield;
    carryRemaining -= carryShield;
    const carryHp = Math.min(incoming.hp, carryRemaining);
    incoming.hp -= carryHp;
    shieldDamage += carryShield;
    hpDamage += carryHp;
    next.vulnerableShots = 0;
  }

  next.hp = next.phases.reduce((sum, phase, index) => sum + (index >= next.phaseIndex ? phase.hp : 0), 0);
  const active = next.phases[next.phaseIndex];
  next.shield = active?.shield ?? 0;
  next.maxShield = active?.maxShield ?? 0;
  next.shieldBroken = next.shield <= 0;
  next.defeated = next.phaseIndex === next.phases.length - 1 && active.hp <= 0;
  const actualDamage = shieldDamage + hpDamage;
  return {
    state: next, rawDamage, modifiedDamage, shieldDamage, hpDamage, actualDamage, overkillDamage, carryDamage,
    shieldBroken: state.shield > 0 && next.shield <= 0 && !phaseChanged,
    phaseChanged, fromPhase, toPhase: next.phaseIndex + 1,
    damageBySource: distributeActualDamage(modifiedComponents, actualDamage), defeated: next.defeated,
  };
}

export function restoreEnemyShieldOnce(state: EnemyCombatState, value: number) {
  if (state.shieldRestoreUsed || state.nodeType === "BOSS") return { state, restored: 0, duplicate: true };
  const restored = Math.min(Math.max(0, value), Math.max(0, state.maxShield - state.shield));
  return { state: { ...state, shield: state.shield + restored, shieldRestoreUsed: true, shieldBroken: state.shield + restored <= 0 }, restored, duplicate: false };
}

export function createBattleTelemetry(args: {
  state: EnemyCombatState;
  playerHp: number;
  ballBagSize: number;
  specialBallCount: number;
  relicCount: number;
  nowMs?: number;
}): BattleTelemetry {
  return {
    levelId: args.state.levelId, enemyId: args.state.enemyId, nodeType: args.state.nodeType, hpProfileVersion: args.state.profileVersion,
    controlGrantedAtMs: args.nowMs ?? Date.now(), shotsFired: 0, shotsMissed: 0, shotConfirmedAtMs: [], damageBySource: emptyDamageBySource(),
    totalDamage: 0, highestSingleShotDamage: 0, overkillDamage: 0, initialEnemyHp: args.state.maxHp,
    initialEnemyShield: args.state.nodeType === "BOSS" ? getBossHpConfig(args.state.profileVersion).totalShield : args.state.maxShield,
    enemyIntentCount: 0, enemyAttackCount: 0, pressureTriggerCount: 0, overflowCount: 0,
    bossPhaseReached: 1, bossPhaseTransitionCount: 0, playerHpAtStart: args.playerHp, playerDamageTaken: 0,
    ballBagSize: args.ballBagSize, specialBallCount: args.specialBallCount, relicCount: args.relicCount,
  };
}

export function recordTelemetryShot(telemetry: BattleTelemetry, args: { missed: boolean; damage: EnemyShotDamageResult; nowMs?: number }) {
  telemetry.shotsFired += 1;
  if (args.missed) telemetry.shotsMissed += 1;
  telemetry.shotConfirmedAtMs.push(args.nowMs ?? Date.now());
  (Object.keys(args.damage.damageBySource) as EnemyDamageSource[]).forEach((source) => { telemetry.damageBySource[source] += args.damage.damageBySource[source]; });
  telemetry.totalDamage += args.damage.actualDamage;
  telemetry.highestSingleShotDamage = Math.max(telemetry.highestSingleShotDamage, args.damage.actualDamage);
  telemetry.overkillDamage += args.damage.overkillDamage;
  if (args.damage.phaseChanged) {
    telemetry.bossPhaseTransitionCount += 1;
    telemetry.bossPhaseReached = Math.max(telemetry.bossPhaseReached, args.damage.toPhase);
  }
}

export function finishBattleTelemetry(telemetry: BattleTelemetry, args: {
  enemy: EnemyCombatState;
  playerHp: number;
  playerDamageTaken: number;
  result: string;
  nowMs?: number;
}): CombatTelemetrySnapshot {
  telemetry.finishedAtMs = args.nowMs ?? Date.now();
  telemetry.playerDamageTaken = args.playerDamageTaken;
  const duration = Math.max(0, (telemetry.finishedAtMs - telemetry.controlGrantedAtMs) / 1000);
  const medianCycle = telemetry.shotsFired ? duration / telemetry.shotsFired : 0;
  return {
    level_id: telemetry.levelId, enemy_id: telemetry.enemyId, node_type: telemetry.nodeType, hp_profile_version: telemetry.hpProfileVersion,
    combat_duration_sec: duration, shots_fired: telemetry.shotsFired, shots_missed: telemetry.shotsMissed, median_shot_cycle_sec: medianCycle,
    clear_damage: telemetry.damageBySource.MATCH_CLEAR, drop_damage: telemetry.damageBySource.BUBBLE_DROP,
    special_ball_damage: telemetry.damageBySource.SPECIAL_BALL, relic_damage: telemetry.damageBySource.RELIC,
    skill_damage: telemetry.damageBySource.SKILL, status_damage: telemetry.damageBySource.STATUS,
    total_damage: telemetry.totalDamage, effective_damage_per_shot: telemetry.shotsFired ? telemetry.totalDamage / telemetry.shotsFired : 0,
    highest_single_shot_damage: telemetry.highestSingleShotDamage, overkill_damage: telemetry.overkillDamage,
    initial_enemy_hp: telemetry.initialEnemyHp, initial_enemy_shield: telemetry.initialEnemyShield,
    remaining_enemy_hp: args.enemy.hp, remaining_enemy_shield: args.enemy.shield,
    boss_phase_reached: telemetry.bossPhaseReached, boss_phase_transition_count: telemetry.bossPhaseTransitionCount,
    enemy_intent_count: telemetry.enemyIntentCount, enemy_attack_count: telemetry.enemyAttackCount,
    pressure_trigger_count: telemetry.pressureTriggerCount, overflow_count: telemetry.overflowCount,
    player_hp_at_start: telemetry.playerHpAtStart, player_hp_at_end: args.playerHp, player_damage_taken: args.playerDamageTaken,
    battle_result: args.result, ball_bag_size: telemetry.ballBagSize, special_ball_count: telemetry.specialBallCount, relic_count: telemetry.relicCount,
  };
}

export function calculateRecommendedEhp(currentEhp: number, targetMedianShots: number, actualMedianShots: number) {
  if (actualMedianShots <= 0) return currentEhp;
  const raw = currentEhp * targetMedianShots / actualMedianShots;
  return Math.round(Math.max(currentEhp * combatPacingConfig.calibration.decreaseCap, Math.min(currentEhp * combatPacingConfig.calibration.increaseCap, raw)));
}

export function percentile(values: number[], quantile: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * Math.max(0, Math.min(1, quantile));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function analyzeCombatPacing(samples: CombatTelemetrySnapshot[], config: EnemyHpConfig) {
  const durations = samples.map((sample) => sample.combat_duration_sec);
  const shots = samples.map((sample) => sample.shots_fired);
  const effectiveDamage = samples.map((sample) => sample.effective_damage_per_shot);
  const playerDamage = samples.map((sample) => sample.player_damage_taken);
  const p50Shots = percentile(shots, .5);
  const currentEhp = config.hp + config.shield;
  return {
    levelId: config.levelId,
    sampleCount: samples.length,
    duration: { p25: percentile(durations, .25), p50: percentile(durations, .5), p75: percentile(durations, .75), p90: percentile(durations, .9) },
    shots: { p25: percentile(shots, .25), p50: p50Shots, p75: percentile(shots, .75), p90: percentile(shots, .9) },
    effectiveDamageP50: percentile(effectiveDamage, .5),
    playerDamageP50: percentile(playerDamage, .5),
    recommendedEhp: calculateRecommendedEhp(currentEhp, (config.targetShotsMin + config.targetShotsMax) / 2, p50Shots),
    passed: percentile(durations, .5) >= config.targetDurationSec.min && percentile(durations, .5) <= config.targetDurationSec.max && p50Shots >= config.targetShotsMin && p50Shots <= config.targetShotsMax,
  };
}
