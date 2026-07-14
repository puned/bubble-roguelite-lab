import shotBudgetData from "../configs/combat/chapter_1_shot_budget.json" with { type: "json" };
import { enemyConfig } from "./core-content.ts";

export type ShotBudgetNodeType = "NORMAL" | "ELITE" | "BOSS";
export type ShotGrantSource = "PRE_BATTLE" | "RELIC" | "SKILL" | "BOARD_CLEAR" | "BOSS_PHASE" | "ERROR_REFUND" | "CONTINUE";
export type ShotWarningLevel = "NORMAL" | "LOW" | "CRITICAL" | "LAST" | "EXHAUSTED";

export type ShotBudgetConfig = {
  levelId: string;
  nodeType: ShotBudgetNodeType;
  targetShotsMin: number;
  targetShotsMax: number;
  baseShotLimit: number;
  preBattleBonusCap: number;
  runtimeGrantCap: number;
  lowWarningThresholds: number[];
  continueShots: number;
  bossPhaseGrants?: Array<{ phaseId: string; grantShots: number }>;
};

export type ShotBudgetState = {
  levelId: string;
  baseShotLimit: number;
  preBattleBonusShots: number;
  initialShots: number;
  remainingShots: number;
  consumedShots: number;
  runtimeGrantedShots: number;
  phaseGrantedShots: number;
  continueGrantedShots: number;
  runtimeGrantCap: number;
  exhausted: boolean;
  continueUsed: boolean;
  activeTransactionId?: string;
  processedTransactionIds: string[];
  refundedTransactionIds: string[];
  processedGrantTransactionIds: string[];
};

export type ShotConsumeRequest = {
  transactionId: string;
  sourceBallUid: string;
  sourceBallId: string;
  consumeAmount: number;
  parentTransactionId?: string;
  isChildProjectile: boolean;
  consumeShotBudget: boolean;
};

export type ShotGrantRequest = {
  source: ShotGrantSource;
  sourceId: string;
  amount: number;
  ignoreRuntimeCap: boolean;
  transactionId: string;
};

export type ShotBudgetResolveResult = {
  oldRemainingShots: number;
  newRemainingShots: number;
  consumed: number;
  granted: number;
  refunded: number;
  exhaustedAfterResolve: boolean;
  failurePending: boolean;
  duplicate: boolean;
};

type RawShotBudgetData = {
  shotBudgetDefaults: Record<ShotBudgetNodeType, Omit<ShotBudgetConfig, "levelId" | "nodeType" | "targetShotsMin" | "targetShotsMax" | "baseShotLimit" | "bossPhaseGrants">>;
  levels: Array<Pick<ShotBudgetConfig, "levelId" | "nodeType" | "targetShotsMin" | "targetShotsMax" | "baseShotLimit" | "bossPhaseGrants">>;
};

const rawData = shotBudgetData as RawShotBudgetData;

export function getShotBudgetConfig(levelId: string): ShotBudgetConfig {
  const level = rawData.levels.find((item) => item.levelId === levelId);
  if (!level) throw new Error(`未找到发射次数配置：${levelId}`);
  const defaults = rawData.shotBudgetDefaults[level.nodeType];
  return {
    ...defaults,
    ...level,
    lowWarningThresholds: [...defaults.lowWarningThresholds],
    bossPhaseGrants: level.nodeType === "BOSS"
      ? enemyConfig.chapter1Bosses[0].phaseShotGrants.map((grant) => ({ phaseId: grant.afterPhaseId, grantShots: grant.grantShots }))
      : level.bossPhaseGrants?.map((grant) => ({ ...grant })),
  };
}

export function validateShotBudgetConfigs() {
  const errors: string[] = [];
  rawData.levels.forEach((level) => {
    const config = getShotBudgetConfig(level.levelId);
    if (!(config.baseShotLimit > 0)) errors.push(`${level.levelId}.baseShotLimit 必须大于 0`);
    if (config.targetShotsMin > config.targetShotsMax) errors.push(`${level.levelId} 目标发射次数区间无效`);
    if (config.preBattleBonusCap < 0 || config.runtimeGrantCap < 0 || config.continueShots <= 0) errors.push(`${level.levelId} 次数上限配置无效`);
    if (config.bossPhaseGrants?.some((grant) => grant.grantShots <= 0)) errors.push(`${level.levelId} Boss 阶段奖励必须大于 0`);
  });
  return errors;
}

const configErrors = validateShotBudgetConfigs();
if (configErrors.length) throw new Error(`发射次数配置无效：${configErrors.join("；")}`);

const resolveResult = (oldRemainingShots: number, state: ShotBudgetState, values: Partial<ShotBudgetResolveResult> = {}): ShotBudgetResolveResult => ({
  oldRemainingShots,
  newRemainingShots: state.remainingShots,
  consumed: 0,
  granted: 0,
  refunded: 0,
  exhaustedAfterResolve: state.remainingShots <= 0,
  failurePending: state.remainingShots <= 0,
  duplicate: false,
  ...values,
});

export function initializeShotBudget(levelId: string, preBattleBonusShots = 0): ShotBudgetState {
  const config = getShotBudgetConfig(levelId);
  const bonus = Math.max(0, Math.min(config.preBattleBonusCap, Math.floor(preBattleBonusShots)));
  const initialShots = config.baseShotLimit + bonus;
  return {
    levelId,
    baseShotLimit: config.baseShotLimit,
    preBattleBonusShots: bonus,
    initialShots,
    remainingShots: initialShots,
    consumedShots: 0,
    runtimeGrantedShots: 0,
    phaseGrantedShots: 0,
    continueGrantedShots: 0,
    runtimeGrantCap: config.runtimeGrantCap,
    exhausted: false,
    continueUsed: false,
    processedTransactionIds: [],
    refundedTransactionIds: [],
    processedGrantTransactionIds: [],
  };
}

export function restoreShotBudgetState(saved: Partial<ShotBudgetState> | undefined, levelId: string, legacyConsumedShots = 0) {
  const fresh = initializeShotBudget(levelId);
  if (!saved || saved.levelId !== levelId) {
    const consumed = Math.max(0, Math.min(fresh.initialShots, Math.floor(legacyConsumedShots)));
    return { ...fresh, remainingShots: fresh.initialShots - consumed, consumedShots: consumed, exhausted: consumed >= fresh.initialShots };
  }
  return {
    ...fresh,
    ...saved,
    levelId,
    remainingShots: Math.max(0, Math.floor(saved.remainingShots ?? fresh.remainingShots)),
    consumedShots: Math.max(0, Math.floor(saved.consumedShots ?? 0)),
    processedTransactionIds: [...(saved.processedTransactionIds ?? [])],
    refundedTransactionIds: [...(saved.refundedTransactionIds ?? [])],
    processedGrantTransactionIds: [...(saved.processedGrantTransactionIds ?? [])],
  } satisfies ShotBudgetState;
}

export function consumeShotBudget(state: ShotBudgetState, request: ShotConsumeRequest) {
  const old = state.remainingShots;
  if (!request.consumeShotBudget || request.isChildProjectile) return { state, result: resolveResult(old, state) };
  if (state.processedTransactionIds.includes(request.transactionId)) return { state, result: resolveResult(old, state, { duplicate: true }) };
  if (state.remainingShots <= 0) throw new Error("SHOT_BUDGET_EXHAUSTED");
  const consumed = Math.max(1, Math.floor(request.consumeAmount));
  const actual = Math.min(state.remainingShots, consumed);
  const next = {
    ...state,
    remainingShots: state.remainingShots - actual,
    consumedShots: state.consumedShots + actual,
    exhausted: state.remainingShots - actual <= 0,
    activeTransactionId: request.transactionId,
    processedTransactionIds: [...state.processedTransactionIds, request.transactionId],
  };
  return { state: next, result: resolveResult(old, next, { consumed: actual }) };
}

export function refundShotBudget(state: ShotBudgetState, transactionId: string) {
  const old = state.remainingShots;
  if (!state.processedTransactionIds.includes(transactionId) || state.refundedTransactionIds.includes(transactionId)) {
    return { state, result: resolveResult(old, state, { duplicate: true }) };
  }
  const next = {
    ...state,
    remainingShots: state.remainingShots + 1,
    consumedShots: Math.max(0, state.consumedShots - 1),
    exhausted: false,
    activeTransactionId: undefined,
    refundedTransactionIds: [...state.refundedTransactionIds, transactionId],
  };
  return { state: next, result: resolveResult(old, next, { refunded: 1, failurePending: false }) };
}

export function grantShotBudget(state: ShotBudgetState, request: ShotGrantRequest) {
  const old = state.remainingShots;
  if (state.processedGrantTransactionIds.includes(request.transactionId)) return { state, result: resolveResult(old, state, { duplicate: true }) };
  const requested = Math.max(0, Math.floor(request.amount));
  const runtimeRemaining = Math.max(0, state.runtimeGrantCap - state.runtimeGrantedShots);
  const granted = request.ignoreRuntimeCap ? requested : Math.min(requested, runtimeRemaining);
  const isRuntime = !request.ignoreRuntimeCap && request.source !== "PRE_BATTLE";
  const next = {
    ...state,
    remainingShots: state.remainingShots + granted,
    runtimeGrantedShots: state.runtimeGrantedShots + (isRuntime ? granted : 0),
    phaseGrantedShots: state.phaseGrantedShots + (request.source === "BOSS_PHASE" ? granted : 0),
    continueGrantedShots: state.continueGrantedShots + (request.source === "CONTINUE" ? granted : 0),
    exhausted: state.remainingShots + granted <= 0,
    processedGrantTransactionIds: [...state.processedGrantTransactionIds, request.transactionId],
  };
  return { state: next, result: resolveResult(old, next, { granted, failurePending: next.remainingShots <= 0 }) };
}

export function grantBossPhaseShots(state: ShotBudgetState, phaseId: string, transactionId: string) {
  const config = getShotBudgetConfig(state.levelId);
  const legacyPhaseIndex = rawData.levels
    .find((level) => level.levelId === state.levelId)
    ?.bossPhaseGrants?.findIndex((grant) => grant.phaseId === phaseId) ?? -1;
  const resolvedPhaseId = legacyPhaseIndex >= 0
    ? config.bossPhaseGrants?.[legacyPhaseIndex]?.phaseId ?? phaseId
    : phaseId;
  const phaseGrant = config.bossPhaseGrants?.find((grant) => grant.phaseId === resolvedPhaseId)?.grantShots ?? 0;
  const totalCap = config.bossPhaseGrants?.reduce((sum, grant) => sum + grant.grantShots, 0) ?? 0;
  const amount = Math.min(phaseGrant, Math.max(0, totalCap - state.phaseGrantedShots));
  return grantShotBudget(state, { source: "BOSS_PHASE", sourceId: resolvedPhaseId, amount, ignoreRuntimeCap: true, transactionId });
}

export function applyShotLimitContinue(state: ShotBudgetState, transactionId: string) {
  if (state.continueUsed) return { state, result: resolveResult(state.remainingShots, state, { duplicate: true }) };
  const config = getShotBudgetConfig(state.levelId);
  const granted = grantShotBudget(state, { source: "CONTINUE", sourceId: "SHOT_LIMIT_CONTINUE", amount: config.continueShots, ignoreRuntimeCap: true, transactionId });
  return { ...granted, state: { ...granted.state, continueUsed: true, exhausted: false } };
}

export function getShotWarningLevel(state: ShotBudgetState): ShotWarningLevel {
  if (state.remainingShots <= 0) return "EXHAUSTED";
  const thresholds = [...getShotBudgetConfig(state.levelId).lowWarningThresholds].sort((a, b) => b - a);
  const last = thresholds.at(-1) ?? 1;
  const critical = thresholds.at(-2) ?? last;
  if (state.remainingShots <= last) return "LAST";
  if (state.remainingShots <= critical) return "CRITICAL";
  if (state.remainingShots <= thresholds[0]) return "LOW";
  return "NORMAL";
}

export function resolveShotBudgetOutcome(state: ShotBudgetState, victory: boolean) {
  if (victory) return "VICTORY" as const;
  return state.remainingShots <= 0 ? "SHOT_LIMIT_EXHAUSTED" as const : "CONTINUE" as const;
}
