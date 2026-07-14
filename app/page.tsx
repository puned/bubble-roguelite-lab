"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { chapterLevels, initialChapterLevel, rewardCatalog, type LevelConfig, type RewardEffect, type RewardOption } from "./levels";
import { getAvailableRewardOptions } from "./reward-rules";
import { getHexNeighborCells, getHexRowColumnCount, getInsertedRowBridgeCells, getSupportedEmptyCells, splitCeilingConnected } from "./board-connectivity";
import { projectCompleteLevelDateLayout, type ProjectedInitialCell } from "./initial-board-layout";
import { getLevelDateLayout } from "./leveldate";
import { calculateBoardOffsetY, getBoardHighRow, getCollapseRowForOffset } from "./board-position";
import {
  buildRouteEncounter,
  canApplyServiceOffer,
  consumeNextBattleEffects,
  createRouteServiceSession,
  createRouteFlowState,
  finalizeRouteService,
  generateRouteOptions,
  getChapterProgress,
  getRouteById,
  getRouteCardsByIds,
  getRouteServiceOffers,
  getSlotNodeType,
  restoreRouteFlowState,
  rerollRouteServiceSession,
  resolveMicroChallengeShot,
  resolveRouteServiceAction,
  selectRouteOnce,
  type RouteArchetype,
  type RouteCardDefinition,
  type RouteEncounterBuild,
  type RouteFlowState,
  type RouteGenerationRequest,
  type RouteServiceContext,
  type RouteServiceType,
} from "./route-flow";
import {
  applyGoldTransaction,
  calculateBattleGold,
  commitBattleGold,
  convertRunGold,
  createRunGoldState,
  getShopRerollPrice,
  getShopSinkType,
  restoreRunGoldState,
  type BattleGoldBreakdown,
  type RunGoldState,
} from "./gold-economy";
import {
  consumeShotBudget,
  getShotBudgetConfig,
  getShotWarningLevel,
  grantShotBudget,
  grantBossPhaseShots,
  initializeShotBudget,
  resolveShotBudgetOutcome,
  restoreShotBudgetState,
  applyShotLimitContinue,
  type ShotBudgetState,
} from "./shot-budget";
import {
  createBattleTelemetry,
  createEnemyCombatState,
  finishBattleTelemetry,
  getActiveBossPhaseConfig,
  getEnemyHpConfig,
  getIntentInterval,
  getIntentPreview,
  recordTelemetryShot,
  resolveEnemyShotDamage,
  restoreEnemyCombatState,
  restoreEnemyShieldOnce,
  spiderQueenBossConfig,
  type BattleTelemetry,
  type EnemyCombatState,
  type EnemyIntentActionConfig,
  type HpProfileVersion,
} from "./combat-pacing";
import {
  completePressureOverflowResult,
  createPressureOverflowTelemetry,
  getPressureBubbleKind,
  loadPressureOverflowConfig,
  resolvePressureOverflowBoard,
  type PressureOverflowResult,
} from "./pressure-overflow";
import {
  addShield,
  applyBattleEndRecovery,
  beginBattleSurvival,
  calculatePressureOverflow,
  canManualRevive,
  createFailureState,
  createPlayerHealthState,
  createSurvivalUiSnapshot,
  getDangerousBubbleIds,
  getLevelSurvivalRules,
  healPlayer,
  increaseMaxHp,
  performDeathPrevent,
  performManualRevive,
  resolvePlayerDamage,
  survivalConfig,
  type DamageEvent,
  type FailureState,
  type PlayerHealthState,
} from "./survival";
import { getBallDefinition, getCharacterDefinition, relicConfig, statusCoreConfig } from "./core-content";
import {
  addOrRefreshStatus,
  acquireRelic,
  canBombClearBubble,
  createConfiguredInitialBallBag,
  getEquivalentColor,
  getBallIdForKind,
  getKindForBallId,
  getDropDamageCap,
  getSpecialEffectMultiplier,
  resolveIcePressure,
  selectRainbowColor,
  shouldTriggerFireEffects,
  tickStatuses,
  type CoreBallKind,
  type RuntimeStatus,
} from "./core-runtime";

type BubbleColor = "red" | "blue" | "yellow" | "green";
type BoardColor = BubbleColor | "stone" | "egg";
type BallKind = CoreBallKind;

type BoardBubble = {
  id: string;
  row: number;
  col: number;
  color: BoardColor;
  webbed?: boolean;
  core?: boolean;
  egg?: boolean;
  countdown?: number;
  poison?: boolean;
  hidden?: boolean;
  mirror?: boolean;
  chain?: boolean;
  coin?: boolean;
  chest?: boolean;
  frozen?: boolean;
  weakpoint?: boolean;
  boardSpecial?: "bomb" | "rainbow" | "charge";
  slime?: boolean;
  hiddenUntil?: number;
  anchor?: boolean;
};

type Point = { x: number; y: number };
type Trajectory = { points: Point[]; impact: Point; hit: BoardBubble | null; ceiling: boolean; rebounds: number };

type BallBagState = {
  current: BallKind;
  next: BallKind;
  reserve: BallKind;
  drawPile: BallKind[];
  discardPile: BallKind[];
  guaranteesUsed: number;
};

type BattleResult = "playing" | "win" | "downed" | "failed";

type RunSettlement = {
  reachedLevel: number;
  failureReason: string;
  totalDamageTaken: number;
  maxSingleDrop: number;
  relicCount: number;
  bagChanges: number;
  metaCurrency: number;
  metaCurrencyBalance: number;
};

type PressureFeedback = {
  result: PressureOverflowResult;
  impacted: BoardBubble[];
  secondaryDetached: BoardBubble[];
};

type DropFeedback = {
  bubbles: BoardBubble[];
  boardOffsetY: number;
  sequence: number;
};

type SavedDemoRun = {
  version: 5;
  levelIndex: number;
  health: PlayerHealthState;
  runBag: BallKind[];
  runRelics: string[];
  gold: number;
  goldState: RunGoldState;
  battleCoinBubbleCountsByPhase: number[];
  battleRelicGold: number;
  battleExtraGold: number;
  battleBoardClearCount: number;
  lastBattleGold: BattleGoldBreakdown | null;
  board: BoardBubble[];
  boardOffsetY: number;
  pressureDepthRows: number;
  ballBag: BallBagState;
  enemyHp?: number;
  enemyState?: EnemyCombatState;
  hpProfile?: HpProfileVersion;
  pressure: number;
  shotCount: number;
  shotBudget?: ShotBudgetState;
  enemyIntentDelay: number;
  enemyIntentClock?: number;
  phaseIntentCount?: number;
  enemyIntentCount?: number;
  enemyAttackCount?: number;
  bossMissWebTriggers?: number;
  reserveLockShots?: number;
  enemyStatuses?: RuntimeStatus[];
  result: BattleResult;
  failureState: FailureState | null;
  runSettlement: RunSettlement | null;
  processedDamageIds: string[];
  processedReviveIds: string[];
  processedPressureResolveIds: string[];
  processedRelicTriggers: string[];
  battleId: string;
  runDamageTaken: number;
  maxSingleDrop: number;
  bagChanges: number;
  routeFlow: RouteFlowState;
  routeSelectionOpen: boolean;
  routeTargetIndex: number;
  focusedRouteId?: string;
  activeRouteId?: string;
  activeRouteSeed?: number;
  routeServiceRouteId?: string;
};

const BOARD_WIDTH = 716;
const BOARD_HEIGHT = 910;
const BUBBLE_RADIUS = 27;
const X_GAP = 64;
const Y_GAP = 55;
const GRID_MAX_ROW = 99;
const BASE_COLLAPSE_ROW = 13;
const BOARD_ORIGIN_Y = 38;
const BOARD_POSITION_THRESHOLD_ROW = 9;
const BOARD_POSITION_VISIBLE_ROW = 8.1;
const BOARD_INVISIBLE_AREA_Y = (0.8 / 0.866) * Y_GAP;
const DANGER_LINE_Y = 804;
const SHOOTER = { x: BOARD_WIDTH / 2, y: 875 };
const SHOOTER_BALL_RADIUS = 34;
const colors: BubbleColor[] = ["red", "blue", "yellow", "green"];
const SAVE_KEY = "bubble-roguelite-survival-v4";
const PERSISTENT_CURRENCY_SAVE_KEY = "bubble-roguelite-persistent-currency-v1";
const LEGACY_SAVE_KEYS = ["bubble-roguelite-survival-v1", "bubble-roguelite-survival-v2", "bubble-roguelite-survival-v3"];

const ballNames: Record<BallKind, string> = {
  red: "红球",
  blue: "蓝球",
  yellow: "黄球",
  green: "绿球",
  bomb: "炸弹球",
  fire: "火焰球",
  ice: "冰冻球",
  rainbow: "彩虹球",
  pierce: "穿透球",
  curseWeb: "蛛网诅咒球",
};

const dangerLabels = {
  NORMAL: "状态稳定",
  WARNING: "生命偏低",
  DANGER: "高危状态",
  CRITICAL: "濒危状态",
} as const;

const routeArchetypeLabels: Record<RouteArchetype, string> = {
  SAFE: "稳健",
  RESOURCE: "资源",
  BUILD: "构筑",
  RISK_REWARD: "高风险",
  CONTROL: "调整",
  STORY: "事件",
  ELITE_VARIANT: "精英挑战",
  BOSS_PREP: "Boss 准备",
};

const routeServiceLabels: Record<RouteServiceType, string> = {
  NONE: "无",
  SHOP: "商店",
  REST: "休息",
  EVENT: "事件",
  WORKSHOP: "工坊",
  SCOUT: "侦察",
  TREASURE: "宝库",
  MICRO_BUBBLE_CHALLENGE: "泡泡试炼",
};

const routeEnemyIds: Record<string, string> = {
  ELITE_STONE: "ELITE_STONE_COLOSSUS",
  ELITE_POISON: "ELITE_POISON_LORD",
  ELITE_WEB: "ELITE_WEB_GUARDIAN",
  BOSS_SPIDER_QUEEN: "BOSS_SPIDER_QUEEN",
};

function nowMs() {
  return Date.now();
}

const relicIcons: Record<string, string> = {
  RELIC_ICE_CLOCK: "❄", RELIC_GRAVITY_HOOK: "⌁", RELIC_PRISM: "◇", RELIC_WEB_CUTTER: "刃",
  RELIC_PHOENIX_FEATHER: "羽", RELIC_LUCKY_BELL: "铃", RELIC_STONE_SHELL: "盾", RELIC_BURN_CORE: "火",
};
const relicLabels: Record<string, { icon: string; name: string; desc: string }> = Object.fromEntries(
  relicConfig.relics.map((relic) => [relic.relicId, {
    icon: relicIcons[relic.relicId] ?? "✦",
    name: relic.name,
    desc: relic.tags.join(" · "),
  }]),
);

const legacyRelicIds: Record<string, string> = {
  iceClock: "RELIC_ICE_CLOCK", gravityHook: "RELIC_GRAVITY_HOOK", prism: "RELIC_PRISM",
  webCutter: "RELIC_WEB_CUTTER", phoenixFeather: "RELIC_PHOENIX_FEATHER",
};
const normalizeRelicId = (id: string) => legacyRelicIds[id] ?? id;
const hasRelic = (ids: string[], relicId: string) => ids.some((id) => normalizeRelicId(id) === relicId);

const baseBag: BallKind[] = createConfiguredInitialBallBag();
const fireBoy = getCharacterDefinition("CHAR_FIRE_BOY")!;
const fireActiveEnergyCost = fireBoy.activeSkill.energyCost ?? 6;
const fireActiveBallKind = getKindForBallId(String(fireBoy.activeSkill.effects.find((effect) => effect.effectType === "TRANSFORM_CURRENT_BALL")?.toBallId)) ?? "fire";
const firePassiveCondition = fireBoy.passiveSkill.conditions?.find((condition) => condition.type === "CLEARED_COLOR_COUNT_AT_LEAST");
const firePassiveBurn = fireBoy.passiveSkill.effects.find((effect) => effect.effectType === "ADD_STATUS_TO_ENEMY");
const fireBallBurn = getBallDefinition("BALL_FIRE")?.effects.find((effect) => effect.effectType === "ADD_STATUS_TO_ENEMY");

function seedFrom(value: string) {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function seededUnit(value: string) {
  let seed = seedFrom(value);
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

function seededShuffle<T>(items: T[], seed: string) {
  return items
    .map((item, index) => ({ item, rank: seededUnit(`${seed}-${index}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

function getActiveColors(runBag: BallKind[], level: LevelConfig): BubbleColor[] {
  const active = colors.filter((color) => runBag.some((kind) => getEquivalentColor(kind) === color));
  return (active.length ? active : ["red"] as BubbleColor[]).slice(0, level.colorSlotCount);
}

function findPlayableColors(board: BoardBubble[]): BubbleColor[] {
  const byCell = new Map(board.map((bubble) => [keyFor(bubble.row, bubble.col), bubble]));
  const playable = new Set<BubbleColor>();
  board.forEach((bubble) => {
    if (!regularColor(bubble.color)) return;
    const hasPair = neighborCells(bubble.row, bubble.col).some(([row, col]) => byCell.get(keyFor(row, col))?.color === bubble.color);
    if (hasPair) playable.add(bubble.color);
  });
  if (playable.size) return [...playable];
  return colors
    .map((color) => ({ color, count: board.filter((bubble) => bubble.color === color).length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .map(({ color }) => color);
}

function ensureOpeningChoices(board: BoardBubble[], palette: BubbleColor[], required: number) {
  const byCell = new Map(board.map((bubble) => [keyFor(bubble.row, bubble.col), bubble]));
  const used = new Set<string>();
  const candidates = board
    .filter((bubble) => regularColor(bubble.color))
    .sort((a, b) => b.row - a.row || a.col - b.col);
  let choices = 0;
  for (const bubble of candidates) {
    if (choices >= required || used.has(bubble.id)) break;
    const neighbor = neighborCells(bubble.row, bubble.col)
      .map(([row, col]) => byCell.get(keyFor(row, col)))
      .find((item) => item && regularColor(item.color) && !used.has(item.id));
    if (!neighbor) continue;
    const color = palette[choices % palette.length];
    bubble.color = color;
    neighbor.color = color;
    used.add(bubble.id);
    used.add(neighbor.id);
    choices += 1;
  }
}

function getInitialBoardBottomRow(level: LevelConfig) {
  return Math.min(level.rows - 1, BASE_COLLAPSE_ROW - level.spawn.bottomSafetyRows);
}

function getBoardOffsetY(board: BoardBubble[], pressureDepthRows: number) {
  return calculateBoardOffsetY(board, {
    rowGap: Y_GAP,
    pressureDepthRows,
    thresholdRow: BOARD_POSITION_THRESHOLD_ROW,
    visibleHighRow: BOARD_POSITION_VISIBLE_ROW,
    invisibleAreaY: BOARD_INVISIBLE_AREA_Y,
  });
}

function getPressureCollapseRow(boardOffsetY: number) {
  return getCollapseRowForOffset(boardOffsetY, DANGER_LINE_Y, BOARD_ORIGIN_Y, Y_GAP);
}

function makeBoard(
  level: LevelConfig,
  runBag: BallKind[] = baseBag,
  source: "LEVELDATE" | "SPAWN" = "SPAWN",
  levelDateCells?: ProjectedInitialCell[],
): BoardBubble[] {
  const palette = getActiveColors(runBag, level);
  const weightedPalette: BubbleColor[] = level.order === 6 && palette.includes("blue") ? [...palette, "blue"] : palette;
  const maxInitialRow = getInitialBoardBottomRow(level);
  const generated: BoardBubble[] = source === "LEVELDATE"
    ? (levelDateCells ?? projectCompleteLevelDateLayout(getLevelDateLayout(level.order), maxInitialRow + 1)).map((cell) => ({
      id: `${level.id}-initial-${cell.row}-${cell.col}`,
      row: cell.row,
      col: cell.col,
      color: weightedPalette[Math.abs(cell.sourceColor) % weightedPalette.length],
      anchor: cell.sourceType === 9 || cell.sourceType === 1300,
    }))
    : [];
  if (source === "SPAWN") {
    for (let row = 0; row <= maxInitialRow; row += 1) {
      const spawnColumns = row % 2 ? 8 : 9;
      for (let spawnCol = 0; spawnCol < spawnColumns; spawnCol += 1) {
        const keep = row === 0 || seededUnit(`${level.id}-cell-${row}-${spawnCol}`) <= level.spawn.boardDensity;
        if (!keep) continue;
        const col = spawnCol + 1;
        generated.push({
          id: `${level.id}-${row}-${col}`,
          row,
          col,
          color: weightedPalette[(Math.floor(spawnCol / 2) + row * 2 + (spawnCol % 3 === 0 ? 1 : 0)) % weightedPalette.length],
        });
      }
    }
  }

  const board = source === "LEVELDATE" ? generated : removeFloating(generated).kept;
  const boardHighRow = getBoardHighRow(board);
  const visibleStartRow = source === "LEVELDATE" ? Math.max(0, boardHighRow - maxInitialRow) : 0;
  const inInitialViewport = (bubble: BoardBubble) => bubble.row >= visibleStartRow && bubble.row <= boardHighRow;
  const visibleRow = (bubble: BoardBubble) => bubble.row - visibleStartRow;
  const take = (
    count: number | undefined,
    apply: (bubble: BoardBubble, index: number) => void,
    salt: string,
    predicate: (bubble: BoardBubble) => boolean = (bubble) => regularColor(bubble.color),
    priority?: (bubble: BoardBubble) => number,
  ) => {
    const candidates = board
      .filter(predicate)
      .sort((a, b) => (priority?.(a) ?? 0) - (priority?.(b) ?? 0)
        || seededUnit(`${level.id}-${salt}-${a.id}`) - seededUnit(`${level.id}-${salt}-${b.id}`));
    candidates.slice(0, count ?? 0).forEach(apply);
  };

  take(level.overlays.stone, (bubble) => { bubble.color = "stone"; }, "stone", (bubble) => inInitialViewport(bubble) && regularColor(bubble.color) && visibleRow(bubble) > 0 && visibleRow(bubble) < maxInitialRow, (bubble) => Math.abs(visibleRow(bubble) - maxInitialRow / 2));
  take(level.overlays.core, (bubble) => { bubble.core = true; bubble.color = palette.includes("blue") ? "blue" : palette[0]; }, "core", (bubble) => inInitialViewport(bubble) && regularColor(bubble.color), (bubble) => Math.abs(visibleRow(bubble) - 3) + Math.abs(bubble.col - 4));
  const core = board.find((bubble) => bubble.core);
  const isUnmarked = (bubble: BoardBubble) => inInitialViewport(bubble) && regularColor(bubble.color)
    && !bubble.core && !bubble.webbed && !bubble.poison && !bubble.hidden && !bubble.chain
    && !bubble.coin && !bubble.chest && !bubble.frozen && !bubble.weakpoint && !bubble.boardSpecial && !bubble.slime;
  take(level.overlays.web, (bubble) => { bubble.webbed = true; }, "web", isUnmarked, core ? (bubble) => Math.hypot(bubble.row - core.row, bubble.col - core.col) : undefined);
  take(level.overlays.poison, (bubble) => { bubble.poison = true; }, "poison", (bubble) => isUnmarked(bubble) && visibleRow(bubble) > 1 && visibleRow(bubble) < maxInitialRow);
  take(level.overlays.hidden, (bubble) => { bubble.hidden = true; bubble.hiddenUntil = 1; }, "hidden", isUnmarked);
  take(level.overlays.chain, (bubble) => { bubble.chain = true; }, "chain", isUnmarked);
  take(level.overlays.coin, (bubble) => { bubble.coin = true; }, "coin", isUnmarked);
  take(level.overlays.chest, (bubble) => { bubble.chest = true; bubble.countdown = 6; }, "chest", isUnmarked, (bubble) => Math.min(bubble.col, getHexRowColumnCount(bubble.row) - 1 - bubble.col));
  take(level.overlays.frozen, (bubble) => { bubble.frozen = true; }, "frozen", (bubble) => isUnmarked(bubble) && visibleRow(bubble) < maxInitialRow);
  take(level.overlays.weakpoint, (bubble) => { bubble.weakpoint = true; }, "weak", isUnmarked, (bubble) => Math.min(bubble.col, getHexRowColumnCount(bubble.row) - 1 - bubble.col));
  take(level.overlays.boardBomb, (bubble) => { bubble.boardSpecial = "bomb"; }, "bomb", isUnmarked);
  take(level.overlays.boardRainbow, (bubble) => { bubble.boardSpecial = "rainbow"; }, "rainbow", (bubble) => isUnmarked(bubble) && visibleRow(bubble) < maxInitialRow);
  take(level.overlays.charge, (bubble) => { bubble.boardSpecial = "charge"; }, "charge", isUnmarked);
  take(level.overlays.slime, (bubble) => { bubble.slime = true; }, "slime", isUnmarked);
  ensureOpeningChoices(board.filter(inInitialViewport), palette, level.spawn.openingChoices);
  return board;
}

function makeInitialBoard(level: LevelConfig, runBag: BallKind[] = baseBag, templateOrder = level.order) {
  const cells = projectCompleteLevelDateLayout(
    getLevelDateLayout(templateOrder),
    getInitialBoardBottomRow(level) + 1,
  );
  return makeBoard(level, runBag, "LEVELDATE", cells);
}

function applyRouteEncounterToBoard(
  board: BoardBubble[],
  encounter: RouteEncounterBuild | null,
  level: LevelConfig,
  runBag: BallKind[],
) {
  if (!encounter) return board;
  const next = board.map((bubble) => ({ ...bubble }));
  const palette = getActiveColors(runBag, level);
  const visibleStartRow = Math.max(0, getBoardHighRow(next) - getInitialBoardBottomRow(level));
  const take = (count: number, salt: string, apply: (bubble: BoardBubble) => void) => {
    next
      .filter((bubble) => bubble.row >= visibleStartRow && regularColor(bubble.color) && !bubble.core && !bubble.anchor && !bubble.boardSpecial)
      .sort((a, b) => seededUnit(`${encounter.routeId}-${salt}-${a.id}`) - seededUnit(`${encounter.routeId}-${salt}-${b.id}`))
      .slice(0, Math.max(0, count))
      .forEach(apply);
  };
  take(encounter.stoneBubbles, "stone", (bubble) => { bubble.color = "stone"; });
  take(encounter.poisonBubbles, "poison", (bubble) => { bubble.poison = true; });
  take(encounter.webBubbles, "web", (bubble) => { bubble.webbed = true; });
  take(encounter.rainbowBubbles, "rainbow", (bubble) => {
    bubble.color = palette[0] ?? "red";
    bubble.boardSpecial = "rainbow";
  });
  return next;
}

function applyEnemyHpMultiplier(state: EnemyCombatState, multiplier: number) {
  if (Math.abs(multiplier - 1) < .001) return state;
  if (state.nodeType !== "BOSS") {
    const maxHp = Math.max(1, Math.round(state.maxHp * multiplier));
    return { ...state, hp: maxHp, maxHp };
  }
  const phases = state.phases.map((phase) => {
    const maxHp = Math.max(1, Math.round(phase.maxHp * multiplier));
    return { ...phase, hp: maxHp, maxHp };
  });
  const maxHp = phases.reduce((sum, phase) => sum + phase.maxHp, 0);
  return { ...state, phases, hp: maxHp, maxHp };
}

function createInitialRouteFlow() {
  const state = createRouteFlowState();
  const request: RouteGenerationRequest = {
    runId: "CH1-RUN-1",
    seed: 1001,
    chapterId: "CHAPTER_1",
    completedSlotIndex: 0,
    nextSlotIndex: 1,
    nextNodeType: "NORMAL",
    playerHpPercent: 1,
    gold: 10,
    ballBagSummary: { size: baseBag.length, specialCount: baseBag.filter((ball) => !colors.includes(ball as BubbleColor)).length, tags: [] },
    relicTags: [],
    recentEnemyFamilies: [],
    recentRouteArchetypes: [],
    recentTemplateFamilyIds: [],
    nonCombatState: state,
  };
  const generated = generateRouteOptions(request);
  return {
    ...state,
    pendingRouteGenerationId: generated.generationId,
    pendingRouteSeed: generated.seed,
    pendingRouteOptions: generated.options.map((route) => route.routeId),
  };
}

function getRoutedRewardOptions(level: LevelConfig, route?: RouteCardDefinition) {
  const base = getAvailableRewardOptions(level);
  if (!route) return base;
  if (route.nodeType === "ELITE") {
    const pools: Record<string, string[]> = {
      ROUTE_ELITE_STONE: ["RELIC_POWDER_BAG", "RELIC_STONE_SHELL", "RELIC_PRESSURE_BARRIER"],
      ROUTE_ELITE_POISON: ["RELIC_PURIFYING_FLASK", "RELIC_LUCKY_BELL", "RELIC_EMERGENCY_BANDAGE"],
      ROUTE_ELITE_WEB: ["RELIC_WEB_CUTTER", "RELIC_SPIDER_SPOOL", "RELIC_PRECISION_RECYCLE"],
    };
    return (pools[route.routeId] ?? pools.ROUTE_ELITE_STONE).map((relicId): RewardOption => {
      const relic = relicConfig.relics.find((item) => item.relicId === relicId)!;
      return {
        id: relic.relicId,
        icon: relicIcons[relic.relicId] ?? "✦",
        name: relic.name,
        rarity: `${relic.rarity} 遗物`,
        desc: relic.tags.join(" · "),
        effect: "ADD_RELIC",
        relicId,
      };
    });
  }
  let preferred = base;
  if (route.primaryArchetype === "RESOURCE") {
    preferred = [base[0], rewardCatalog.gold20, base[1]];
  } else if (route.primaryArchetype === "BUILD") {
    preferred = [base[0], rewardCatalog.remove, base[1]];
  } else if (route.rewardRarityBonus >= .15) {
    preferred = [rewardCatalog.rainbow, rewardCatalog.gold20, base[0]];
  }
  const unique = preferred.filter(Boolean).filter((reward, index, items) => items.findIndex((item) => item.id === reward.id) === index);
  return [...unique, ...base.filter((reward) => !unique.some((item) => item.id === reward.id))].slice(0, 3);
}

function makeSpawnedBoard(level: LevelConfig, runBag: BallKind[] = baseBag) {
  return makeBoard(level, runBag, "SPAWN");
}

function makeBallBag(runBag: BallKind[], level: LevelConfig, board: BoardBubble[], seed: number): BallBagState {
  const activeColors = getActiveColors(runBag, level);
  const playableColors = findPlayableColors(board).filter((color) => activeColors.includes(color));
  const clearSpecials: BallKind[] = ["bomb", "fire", "rainbow", "pierce"];
  const hasClearSpecial = runBag.some((ball) => clearSpecials.includes(ball));
  const hasAnySpecial = runBag.some((ball) => !colors.includes(ball as BubbleColor));
  const pile = seededShuffle([...runBag], `${level.id}-bag-${seed}`);
  const temporaryDiscard: BallKind[] = [];
  let temporaryReserve: BallKind | null = null;
  const temporary = level.spawn.temporary;
  const shouldInject = temporary && (
    (temporary.condition === "NO_CLEAR_SPECIAL" && !hasClearSpecial)
    || (temporary.condition === "NO_SPECIAL" && !hasAnySpecial)
    || (temporary.condition === "LOW_COLOR_SET" && activeColors.length <= 2)
    || (temporary.condition === "NO_BLUE_OR_FREEZE" && !activeColors.includes("blue"))
  );
  if (temporary && shouldInject) {
    temporary.kinds.forEach((kind, index) => {
      if (temporary.placement === "RESERVE") temporaryReserve = kind;
      else if (temporary.placement === "DISCARD") temporaryDiscard.push(kind);
      else if (temporary.placement === "RANDOM") {
        const insertAt = Math.floor(seededUnit(`${level.id}-temp-${index}-${seed}`) * (pile.length + 1));
        pile.splice(insertAt, 0, kind);
      } else {
        const maxIndex = Math.max(0, Math.min(pile.length, (temporary.within ?? 6) - 1));
        pile.splice(Math.max(0, maxIndex - index), 0, kind);
      }
    });
  }

  const promotePlayable = (target: number) => {
    const index = pile.findIndex((ball, itemIndex) => itemIndex >= target && playableColors.includes(getEquivalentColor(ball) as BubbleColor));
    if (index < 0) return;
    [pile[target], pile[index]] = [pile[index], pile[target]];
  };
  if (level.order === 1) {
    for (let index = 0; index < 3; index += 1) promotePlayable(index);
  } else if (level.spawn.openingProtectedDraws > 0) {
    promotePlayable(Math.min(2, level.spawn.openingProtectedDraws - 1));
  }
  while (pile.length < 3) pile.push(activeColors[pile.length % activeColors.length]);
  if (level.order === 2 && !temporaryReserve) promotePlayable(2);

  return {
    current: pile[0] ?? activeColors[0],
    next: pile[1] ?? activeColors[0],
    reserve: temporaryReserve ?? pile[2] ?? activeColors[0],
    drawPile: pile.slice(temporaryReserve ? 2 : 3),
    discardPile: temporaryDiscard,
    guaranteesUsed: 0,
  };
}

function bubblePosition(row: number, col: number): Point {
  return {
    x: 38 + col * X_GAP + (row % 2 ? X_GAP / 2 : 0),
    y: BOARD_ORIGIN_Y + row * Y_GAP,
  };
}

function bubbleScreenPosition(row: number, col: number, boardOffsetY: number): Point {
  const position = bubblePosition(row, col);
  return { ...position, y: position.y + boardOffsetY };
}

function neighborCells(row: number, col: number): Array<[number, number]> {
  return getHexNeighborCells(row, col, GRID_MAX_ROW);
}

function keyFor(row: number, col: number) {
  return `${row}:${col}`;
}

function regularColor(color: BoardColor): color is BubbleColor {
  return colors.includes(color as BubbleColor);
}

function calculateTrajectory(board: BoardBubble[], target: Point, boardOffsetY: number, ignoreFirstCollision = false): Trajectory {
  const aimY = Math.min(target.y, SHOOTER.y - 80);
  let dx = target.x - SHOOTER.x;
  let dy = aimY - SHOOTER.y;
  const magnitude = Math.hypot(dx, dy) || 1;
  dx = (dx / magnitude) * 4.4;
  dy = (dy / magnitude) * 4.4;

  let x = SHOOTER.x;
  let y = SHOOTER.y - 34;
  const points: Point[] = [{ x, y }];
  let hit: BoardBubble | null = null;
  let ignoredBubbleId: string | undefined;
  let ceiling = false;
  let rebounds = 0;

  for (let step = 0; step < 900; step += 1) {
    x += dx;
    y += dy;
    if (x <= BUBBLE_RADIUS) {
      x = BUBBLE_RADIUS;
      dx = Math.abs(dx);
      rebounds += 1;
      points.push({ x, y });
    } else if (x >= BOARD_WIDTH - BUBBLE_RADIUS) {
      x = BOARD_WIDTH - BUBBLE_RADIUS;
      dx = -Math.abs(dx);
      rebounds += 1;
      points.push({ x, y });
    }

    hit = board.find((bubble) => {
      if (bubble.id === ignoredBubbleId) return false;
      const center = bubbleScreenPosition(bubble.row, bubble.col, boardOffsetY);
      return Math.hypot(center.x - x, center.y - y) <= BUBBLE_RADIUS * 1.86;
    }) ?? null;

    if (hit && ignoreFirstCollision && !ignoredBubbleId) {
      ignoredBubbleId = hit.id;
      hit = null;
      continue;
    }
    if (hit) break;
    if (y <= BUBBLE_RADIUS + 4) {
      ceiling = true;
      y = BUBBLE_RADIUS + 4;
      break;
    }
    if (step % 5 === 0) points.push({ x, y });
  }

  const impact = { x, y };
  points.push(impact);
  return { points, impact, hit, ceiling, rebounds };
}

function findSnapCell(board: BoardBubble[], trajectory: Trajectory, boardOffsetY: number): [number, number] | null {
  const occupied = new Set(board.map((bubble) => keyFor(bubble.row, bubble.col)));
  let candidates: Array<[number, number]> = [];

  if (trajectory.hit) {
    candidates = neighborCells(trajectory.hit.row, trajectory.hit.col)
      .filter(([row, col]) => !occupied.has(keyFor(row, col)));
  } else if (trajectory.ceiling) {
    candidates = getSupportedEmptyCells(board, GRID_MAX_ROW);
  }

  if (!candidates.length) {
    candidates = getSupportedEmptyCells(board, GRID_MAX_ROW);
  }

  return candidates
    .map((cell) => {
      const position = bubbleScreenPosition(cell[0], cell[1], boardOffsetY);
      return { cell, distance: Math.hypot(position.x - trajectory.impact.x, position.y - trajectory.impact.y) };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.cell ?? null;
}

function findColorCluster(board: BoardBubble[], start: BoardBubble, color: BubbleColor) {
  const byCell = new Map(board.map((bubble) => [keyFor(bubble.row, bubble.col), bubble]));
  const visited = new Set<string>();
  const queue = [start];
  const result: BoardBubble[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.core || current.mirror || current.chain || current.frozen || current.boardSpecial === "bomb") continue;
    if (current.color !== color && current.boardSpecial !== "rainbow") continue;
    result.push(current);
    neighborCells(current.row, current.col).forEach(([row, col]) => {
      const neighbor = byCell.get(keyFor(row, col));
      if (neighbor && !visited.has(neighbor.id)) queue.push(neighbor);
    });
  }
  return result;
}

function selectRainbowColorForCell(board: BoardBubble[], cell: [number, number], runBag: BallKind[], shot: number) {
  const weights = new Map<BubbleColor, number>();
  runBag.forEach((kind) => {
    const color = getEquivalentColor(kind);
    if (color && color !== "rainbow" && color !== "dynamic") weights.set(color, (weights.get(color) ?? 0) + 1);
  });
  return selectRainbowColor(colors.map((color) => {
    const placed: BoardBubble = { id: `rainbow-preview-${shot}-${color}`, row: cell[0], col: cell[1], color };
    const withPlaced = [...board, placed];
    const cluster = findColorCluster(withPlaced, placed, color);
    const clearIds = new Set(cluster.length >= 3 ? cluster.map((bubble) => bubble.id) : []);
    const remaining = withPlaced.filter((bubble) => !clearIds.has(bubble.id));
    return {
      color,
      immediateMatchSize: cluster.length,
      dropPotential: clearIds.size ? removeFloating(remaining).dropped.length : 0,
      activeColorWeight: weights.get(color) ?? 0,
    };
  }));
}

function copyPierceColor(board: BoardBubble[], cell: [number, number], fallback: BubbleColor) {
  const byCell = new Map(board.map((bubble) => [keyFor(bubble.row, bubble.col), bubble]));
  for (const [row, col] of neighborCells(cell[0], cell[1])) {
    const neighbor = byCell.get(keyFor(row, col));
    if (neighbor && regularColor(neighbor.color) && !neighbor.core) return neighbor.color;
  }
  return fallback;
}

function expandBoardBombClears(board: BoardBubble[], initialIds: Set<string>) {
  const clearIds = new Set(initialIds);
  const queue = board.filter((bubble) => clearIds.has(bubble.id) && bubble.boardSpecial === "bomb");
  const triggered = new Set<string>();
  while (queue.length) {
    const bomb = queue.shift()!;
    if (triggered.has(bomb.id)) continue;
    triggered.add(bomb.id);
    const affectedCells = new Set([keyFor(bomb.row, bomb.col), ...neighborCells(bomb.row, bomb.col).map(([row, col]) => keyFor(row, col))]);
    board.forEach((bubble) => {
      if (bubble.core || !affectedCells.has(keyFor(bubble.row, bubble.col)) || clearIds.has(bubble.id)) return;
      clearIds.add(bubble.id);
      if (bubble.boardSpecial === "bomb") queue.push(bubble);
    });
  }
  return clearIds;
}

function removeFloating(board: BoardBubble[]) {
  return splitCeilingConnected(
    board,
    GRID_MAX_ROW,
    (bubble) => bubble.row === 0 || Boolean(bubble.anchor) || Boolean(bubble.webbed),
  );
}

function spawnBossCore(board: BoardBubble[], levelId: string, phaseIndex: number) {
  const withoutOldCore = board.map((bubble) => bubble.core ? { ...bubble, core: false } : { ...bubble });
  const cell = getSupportedEmptyCells(withoutOldCore, GRID_MAX_ROW)
    .sort((a, b) => Math.abs(bubblePosition(a[0], a[1]).x - BOARD_WIDTH / 2) - Math.abs(bubblePosition(b[0], b[1]).x - BOARD_WIDTH / 2))[0];
  if (!cell) {
    const host = [...withoutOldCore].sort((a, b) => Math.abs(bubblePosition(a.row, a.col).x - BOARD_WIDTH / 2) - Math.abs(bubblePosition(b.row, b.col).x - BOARD_WIDTH / 2))[0];
    return host ? withoutOldCore.map((bubble) => bubble.id === host.id ? { ...bubble, core: true } : bubble) : withoutOldCore;
  }
  return [...withoutOldCore, {
    id: `boss-core-${levelId}-${phaseIndex}`,
    row: cell[0],
    col: cell[1],
    color: "blue" as BoardColor,
    core: true,
  }];
}

// 保留旧版意图实现，便于灰度档位出现异常时快速对照回退。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function applyEnemyIntent(
  board: BoardBubble[],
  level: LevelConfig,
  phase: number,
  shot: number,
  hasPreviewLens: boolean,
  missed: boolean,
) {
  const next = board.map((bubble) => ({ ...bubble }));
  const candidates = next.filter((bubble) => regularColor(bubble.color) && !bubble.chest && !bubble.core && !bubble.coin && !bubble.weakpoint && !bubble.boardSpecial);
  const pick = (index: number) => candidates[(shot * 3 + index * 5) % Math.max(1, candidates.length)];
  let damage = 0;
  const goldDelta = 0;
  let note = level.intentLabel;
  let triggered = false;
  const survivalRules = getLevelSurvivalRules(level.order, level.nodeType);
  const attackDamage = survivalRules.phaseAttackDamage[Math.max(0, Math.min(2, phase - 1))];

  if (!candidates.length) return { board: next, note, damage, goldDelta, triggered };

  const addWebs = (count: number, pool = candidates) => {
    const cap = level.order === 10 ? Math.floor(next.length * .22) : next.length;
    let available = Math.max(0, cap - next.filter((bubble) => bubble.webbed || bubble.egg).length);
    for (let index = 0; index < count && available > 0; index += 1) {
      const bubble = pool[(shot + index * 3) % pool.length];
      if (bubble && !bubble.webbed) {
        bubble.webbed = true;
        available -= 1;
      }
    }
  };

  switch (level.intentAction) {
    case "ATTACK":
      if (shot % 3 === 0) {
        damage = attackDamage;
        note = `林地史莱姆撞击：造成 ${damage} 点伤害`;
        triggered = true;
      }
      break;
    case "SLIME_BIG":
      if (shot % 4 === 0) {
        const target = pick(0);
        if (target) target.slime = true;
        damage = attackDamage;
        note = `巨史莱姆攻击 ${damage} 点，并给 1 个普通泡泡附加黏液标记`;
        triggered = true;
      }
      break;
    case "STONE": {
      if (shot % 4 !== 0) break;
      const safe = candidates.filter((bubble) => bubble.row > 0 && bubble.row < GRID_MAX_ROW - 1);
      const target = safe[(shot * 3) % Math.max(1, safe.length)] ?? pick(0);
      if (target) target.color = "stone";
      damage = attackDamage;
      note = `轻型石像攻击 ${damage} 点，并在中上层生成 1 个石头泡泡`;
      triggered = true;
      break;
    }
    case "POISON":
      if (shot % 3 === 0) {
        const safe = candidates.filter((bubble) => bubble.row < GRID_MAX_ROW - 1);
        [safe[(shot + 1) % safe.length], safe[(shot + 4) % safe.length]].forEach((bubble) => { if (bubble) bubble.poison = true; });
        damage = attackDamage;
        note = `毒菇攻击 ${damage} 点，并污染 2 个安全区普通泡泡`;
        triggered = true;
      }
      break;
    case "ELITE_COMBO": {
      const actions: string[] = [];
      const safe = candidates.filter((bubble) => bubble.row < GRID_MAX_ROW - 1);
      if (shot % 3 === 0) {
        addWebs(2, safe);
        actions.push("附加 2 层蛛网");
      }
      if (shot % 5 === 0) {
        const target = safe[(shot * 2) % Math.max(1, safe.length)];
        if (target) target.color = "stone";
        actions.push("生成 1 个石头");
        damage = attackDamage;
      }
      if (actions.length) {
        note = `蛛网石像${actions.join("，")}${damage ? `，并攻击 ${damage} 点` : ""}`;
        triggered = true;
      }
      break;
    }
    case "ICE_SPRITE":
      if (shot % 4 === 0) {
        const safe = candidates.filter((bubble) => bubble.row < GRID_MAX_ROW - 1);
        [safe[shot % safe.length], safe[(shot + 3) % safe.length]].forEach((bubble) => { if (bubble) bubble.frozen = true; });
        damage = attackDamage;
        note = `冰灵攻击 ${damage} 点，并冻结 2 个非底部泡泡`;
        triggered = true;
      }
      break;
    case "BAT_TRICKSTER":
      if (shot % 4 === 0) {
        const safe = candidates.filter((bubble) => !bubble.weakpoint);
        [safe[shot % safe.length], safe[(shot + 2) % safe.length]].forEach((bubble) => {
          if (!bubble) return;
          bubble.hidden = true;
          bubble.hiddenUntil = shot + 2;
        });
        damage = attackDamage;
        note = `回声蝙蝠攻击 ${damage} 点，并隐藏 2 个泡泡颜色，持续 2 发`;
        triggered = true;
      }
      break;
    case "GHOST_PAINTER": {
      const actions: string[] = [];
      if (shot % 4 === 0) {
        const hideCount = hasPreviewLens ? 1 : 3;
        for (let index = 0; index < hideCount; index += 1) {
          const target = pick(index);
          if (target) target.hidden = true;
        }
        actions.push(`制造 ${hideCount} 个幻影`);
      }
      if (shot % 6 === 0) {
        const first = pick(0);
        const second = pick(2);
        if (first && second) [first.color, second.color] = [second.color, first.color];
        actions.push("交换一小块颜色");
      }
      if (actions.length) {
        damage = attackDamage;
        note = `幽灵画师${actions.join("，")}，并攻击 ${damage} 点`;
        triggered = true;
      }
      break;
    }
    case "WEB_ACOLYTE": {
      const core = next.find((bubble) => bubble.core);
      if (!core) break;
      const nearby = candidates.sort((a, b) => Math.hypot(a.row - core.row, a.col - core.col) - Math.hypot(b.row - core.row, b.col - core.col));
      const actions: string[] = [];
      if (shot % 3 === 0) {
        addWebs(1, nearby.slice(0, 6));
        actions.push("给核心周边附加 1 层蛛网");
      }
      if (shot % 6 === 0) {
        const protector = nearby.find((bubble) => !bubble.webbed);
        if (protector) protector.webbed = true;
        actions.push("修复 1 个保护泡泡");
      }
      if (actions.length) {
        damage = attackDamage;
        note = `蛛巢侍从${actions.join("，")}，并攻击 ${damage} 点`;
        triggered = true;
      }
      break;
    }
    case "SPIDER_QUEEN":
      if (phase === 1) {
        if (shot % 3 === 0) {
          addWebs(2);
          damage = attackDamage;
          note = `蛛后织出 2 层蛛网，并攻击 ${damage} 点`;
          triggered = true;
        }
      } else if (phase === 2) {
        if (shot % 4 === 0 && next.filter((bubble) => bubble.webbed || bubble.egg).length < Math.floor(next.length * .22)) {
          const target = pick(0);
          if (target) {
            target.egg = true;
            target.countdown = 3;
          }
          damage = attackDamage;
          note = `蛛后产下 1 枚蜘蛛卵，3 发后孵化，并攻击 ${damage} 点`;
          triggered = true;
        }
      } else if (missed) {
        addWebs(2);
        damage = attackDamage;
        note = `蛛网风暴惩罚空发：新增 2 层蛛网并造成 ${damage} 点伤害`;
        triggered = true;
      }
      break;
    default:
      break;
  }
  return { board: next, note, damage, goldDelta, triggered };
}

const intentNames: Record<string, string> = {
  ATTACK_PLAYER: "直接攻击",
  SPAWN_BUBBLE: "生成障碍",
  ADD_MODIFIER: "强化盘面",
  RESTORE_SHIELD: "修复护盾",
  LOCK_RESERVE: "封锁备用球",
  TICK_OBJECT: "推进孵化",
  COMPOSITE: "复合行动",
};

function getConfiguredIntentName(action: EnemyIntentActionConfig | null) {
  if (!action) return "蓄力中";
  const kind = String(action.params?.kind ?? "");
  const kindNames: Record<string, string> = {
    SLIME: "黏液泡泡", NORMAL: "补充泡泡", STONE: "石头泡泡", POISON: "毒性污染",
    POISON_STRENGTHEN: "毒性强化", WEB: "蛛网缠绕", WEB_STRENGTHEN: "蛛网强化",
    MIRROR: "镜像泡泡", EGG: "蜘蛛卵",
  };
  return kindNames[kind] ?? intentNames[action.actionType] ?? action.actionId;
}

function getConfiguredIntentDamage(action: EnemyIntentActionConfig | null) {
  if (!action) return 0;
  if (action.effects?.length) return action.effects
    .filter((effect) => effect.effectType === "DAMAGE_PLAYER")
    .reduce((sum, effect) => sum + Number(effect.value ?? 0), 0);
  return action.actionType === "ATTACK_PLAYER" ? action.value ?? 0 : 0;
}

function applyConfiguredEnemyIntent(
  board: BoardBubble[],
  action: EnemyIntentActionConfig,
  shot: number,
  boardOffsetY: number,
) {
  const next = board.map((bubble) => ({ ...bubble }));
  const fallbackEffect = action.actionType === "ATTACK_PLAYER" ? { effectType: "DAMAGE_PLAYER", value: action.value }
    : action.actionType === "RESTORE_SHIELD" ? { effectType: "RESTORE_ENEMY_SHIELD", value: action.value }
      : action.actionType === "LOCK_RESERVE" ? { effectType: "ADD_STATUS_TO_PLAYER", statusId: "STATUS_RESERVE_LOCK", durationPlayerShots: action.value }
        : { effectType: action.actionType === "SPAWN_BUBBLE" ? "SPAWN_BOARD_BUBBLE" : "ADD_BOARD_MODIFIER", count: action.count, kind: action.params?.kind };
  const effects = action.effects?.length ? action.effects : [fallbackEffect];
  let damage = 0;
  let reserveLockShots = 0;
  let shieldRestore = 0;
  const playerStatuses: Array<{ statusId: string; value: number; durationEnemyActions: number }> = [];
  let appliedCount = 0;

  const candidatePool = () => {
    const candidates = next.filter((bubble) => regularColor(bubble.color) && !bubble.chest && !bubble.core && !bubble.coin && !bubble.weakpoint && !bubble.boardSpecial);
    const safe = candidates.filter((bubble) => {
      const screenY = bubbleScreenPosition(bubble.row, bubble.col, boardOffsetY).y;
      return screenY > BUBBLE_RADIUS && screenY < DANGER_LINE_Y - Y_GAP;
    });
    return safe.length ? safe : candidates;
  };
  const pickTargets = (count: number, targetRule: unknown) => {
    const pool = candidatePool();
    const ordered = String(targetRule).includes("LOWEST")
      ? [...pool].sort((a, b) => b.row - a.row || a.col - b.col)
      : [...pool].sort((a, b) => seededUnit(`${action.actionId}-${shot}-${a.id}`) - seededUnit(`${action.actionId}-${shot}-${b.id}`));
    return ordered.slice(0, Math.min(Math.max(0, count), ordered.length));
  };

  effects.forEach((effect, effectIndex) => {
    const count = Math.max(1, Number(effect.count ?? 1));
    if (effect.effectType === "DAMAGE_PLAYER") {
      damage += Math.max(0, Number(effect.value ?? 0));
    } else if (effect.effectType === "RESTORE_ENEMY_SHIELD") {
      shieldRestore += Math.max(0, Number(effect.value ?? 0));
    } else if (effect.effectType === "ADD_STATUS_TO_PLAYER") {
      if (effect.statusId === "STATUS_RESERVE_LOCK") reserveLockShots = Math.max(reserveLockShots, Number(effect.durationPlayerShots ?? 1));
      else if (typeof effect.statusId === "string") playerStatuses.push({
        statusId: effect.statusId,
        value: Number(effect.value ?? 1),
        durationEnemyActions: Number(effect.durationEnemyActions ?? 1),
      });
    } else if (effect.effectType === "ADD_BOARD_MODIFIER" || effect.effectType === "ADD_BOARD_TAG" || effect.effectType === "TRANSFORM_BOARD_BUBBLE") {
      const targets = pickTargets(count, effect.targetRule);
      targets.forEach((bubble) => {
        if (effect.effectType === "ADD_BOARD_MODIFIER" && effect.modifierId === "MOD_WEB") bubble.webbed = true;
        else if (effect.effectType === "ADD_BOARD_TAG") bubble.slime = true;
        else if (effect.effectType === "TRANSFORM_BOARD_BUBBLE" && effect.toBubbleId === "BUBBLE_POISON") bubble.poison = true;
      });
      appliedCount += targets.length;
    } else if (effect.effectType === "SPREAD_BOARD_BUBBLE_TYPE") {
      const poisoned = next.filter((bubble) => bubble.poison);
      const spreadTargets = poisoned.flatMap((source) => neighborCells(source.row, source.col))
        .map(([row, col]) => next.find((bubble) => bubble.row === row && bubble.col === col))
        .filter((bubble): bubble is BoardBubble => Boolean(bubble && regularColor(bubble.color) && !bubble.poison && !bubble.core))
        .filter((bubble, index, items) => items.findIndex((item) => item.id === bubble.id) === index)
        .slice(0, count);
      spreadTargets.forEach((bubble) => { bubble.poison = true; });
      appliedCount += spreadTargets.length;
    } else if (effect.effectType === "SPAWN_BOARD_BUBBLE" || effect.effectType === "SPAWN_COLORED_BUBBLES") {
      const bubbleId = String(effect.bubbleId ?? "BUBBLE_NORMAL");
      const existingCount = next.filter((bubble) => bubbleId === "BUBBLE_MIRROR" ? bubble.mirror : bubbleId === "BUBBLE_SPIDER_EGG" ? bubble.egg : false).length;
      const allowed = Math.max(0, Math.min(count, Number(effect.maxOnBoard ?? Number.POSITIVE_INFINITY) - existingCount));
      const emptyCells = getSupportedEmptyCells(next, GRID_MAX_ROW)
        .filter(([row, col]) => bubbleScreenPosition(row, col, boardOffsetY).y < DANGER_LINE_Y - Y_GAP)
        .sort((a, b) => seededUnit(`${action.actionId}-${shot}-${effectIndex}-${a[0]}-${a[1]}`) - seededUnit(`${action.actionId}-${shot}-${effectIndex}-${b[0]}-${b[1]}`))
        .slice(0, allowed);
      const palette = findPlayableColors(next);
      emptyCells.forEach(([row, col], index) => {
        const created: BoardBubble = {
          id: `intent-${action.actionId}-${shot}-${effectIndex}-${index}`,
          row,
          col,
          color: palette[(shot + index) % Math.max(1, palette.length)] ?? "red",
        };
        if (bubbleId === "BUBBLE_STONE") created.color = "stone";
        else if (bubbleId === "BUBBLE_MIRROR") created.mirror = true;
        else if (bubbleId === "BUBBLE_SPIDER_EGG") { created.color = "egg"; created.egg = true; created.countdown = 3; }
        else if (effect.effectType === "SPAWN_COLORED_BUBBLES") created.slime = true;
        next.push(created);
      });
      appliedCount += emptyCells.length;
    }
  });

  return {
    board: next,
    damage,
    reserveLockShots,
    shieldRestore,
    playerStatuses,
    note: action.displayName ?? `${getConfiguredIntentName(action)}${appliedCount ? ` ${appliedCount}` : ""}`,
  };
}

function addPressureRow(board: BoardBubble[], shot: number, level: LevelConfig, runBag: BallKind[], phase: number, boardDropRows: number) {
  const dropRows = Math.max(1, Math.floor(boardDropRows));
  const shifted = board.map((bubble) => ({ ...bubble, row: bubble.row + dropRows }));
  const palette = getActiveColors(runBag, level);
  const pressureRules = level.spawn.pressure;
  const density = level.order === 10 && phase === 3 ? Math.max(pressureRules.density, .86) : pressureRules.density;
  const bossWebRate = level.order === 10 ? (phase === 3 ? .12 : phase === 2 ? .08 : .06) : pressureRules.webRate;
  const newRows = Array.from({ length: dropRows }, (_, pressureRow) => {
    const spawnColumnCount = pressureRow % 2 ? 8 : 9;
    const columns = Array.from({ length: spawnColumnCount }, (_, col) => col)
      .sort((a, b) => seededUnit(`${level.id}-pressure-cell-${shot}-${pressureRow}-${a}`) - seededUnit(`${level.id}-pressure-cell-${shot}-${pressureRow}-${b}`))
      .slice(0, Math.max(1, Math.round(spawnColumnCount * density)))
      .sort((a, b) => a - b);
    const row = columns.map((spawnCol): BoardBubble => ({
      col: spawnCol + 1,
      id: `pressure-${level.id}-${shot}-${pressureRow}-${spawnCol + 1}`,
      row: pressureRow,
      color: palette[(shot + pressureRow + spawnCol * 3) % palette.length],
    }));
    const tagByRate = (
      rate: number | undefined,
      salt: string,
      apply: (bubble: BoardBubble) => void,
      predicate: (bubble: BoardBubble) => boolean = () => true,
    ) => {
      if (!rate) return;
      const candidates = row.filter(predicate).sort((a, b) => seededUnit(`${a.id}-${salt}`) - seededUnit(`${b.id}-${salt}`));
      const exact = candidates.length * rate;
      const count = Math.floor(exact) + (seededUnit(`${level.id}-${salt}-${shot}-${pressureRow}`) < exact % 1 ? 1 : 0);
      candidates.slice(0, count).forEach(apply);
    };
    tagByRate(pressureRules.stoneRate, "stone", (bubble) => { bubble.color = "stone"; });
    tagByRate(bossWebRate, "web", (bubble) => { bubble.webbed = true; }, (bubble) => bubble.color !== "stone");
    tagByRate(pressureRules.poisonRate, "poison", (bubble) => { bubble.poison = true; }, (bubble) => bubble.color !== "stone" && !bubble.webbed);
    tagByRate(pressureRules.hiddenRate, "hidden", (bubble) => { bubble.hidden = true; bubble.hiddenUntil = shot + 1; }, (bubble) => bubble.color !== "stone" && !bubble.webbed && !bubble.poison);
    tagByRate(pressureRules.frozenRate, "frozen", (bubble) => { bubble.frozen = true; }, (bubble) => bubble.color !== "stone" && !bubble.webbed && !bubble.poison && !bubble.hidden);
    tagByRate(pressureRules.specialRate, "special", (bubble) => { bubble.boardSpecial = "bomb"; }, (bubble) => bubble.color !== "stone" && !bubble.webbed && !bubble.poison && !bubble.hidden && !bubble.frozen);
    if (pressureRow === 0 && level.order === 10 && phase === 2 && row.length && seededUnit(`${level.id}-egg-${shot}`) < .6) {
      const egg = row.find((bubble) => !bubble.webbed && bubble.color !== "stone") ?? row[0];
      egg.egg = true;
      egg.countdown = 3;
    }
    return row;
  }).flat();
  if (board.length) {
    getInsertedRowBridgeCells(newRows, shifted, dropRows, GRID_MAX_ROW).forEach(([row, col], index) => {
      newRows.push({
        id: `pressure-bridge-${level.id}-${shot}-${row}-${col}-${index}`,
        row,
        col,
        color: palette[(shot + row + col) % palette.length],
      });
    });
  }
  // 越线球暂时保留在事务输入中，由压力专用解析器统一收集、计伤并强制销毁。
  return { board: [...shifted, ...newRows], dropRows };
}

function advanceBallBag(
  state: BallBagState,
  board: BoardBubble[],
  misses: number,
  level: LevelConfig,
  phase: number,
  pressure: number,
  shot: number,
): BallBagState {
  let pile = [...state.drawPile];
  let discard = state.current === "curseWeb" ? [...state.discardPile] : [...state.discardPile, state.current];
  if (!pile.length) {
    pile = seededShuffle(discard, `${level.id}-reshuffle-${shot}`);
    discard = [];
  }

  let drawIndex = 0;
  const playableColors = findPlayableColors(board);
  const p3LimitReached = level.order === 10 && phase === 3 && state.guaranteesUsed >= (level.spawn.antiStallMax ?? 2);
  const shouldGuarantee = misses >= 2 && !p3LimitReached;
  if (shouldGuarantee) {
    const stoneCount = board.filter((bubble) => bubble.color === "stone").length;
    const clearSpecialIndex = pile.findIndex((ball) => ball === "bomb" || ball === "fire" || ball === "rainbow" || ball === "pierce");
    const playableIndex = pile.findIndex((ball) => playableColors.includes(getEquivalentColor(ball) as BubbleColor));
    if (level.order === 3 && stoneCount >= 4 && clearSpecialIndex >= 0) drawIndex = clearSpecialIndex;
    else if (playableIndex >= 0) drawIndex = playableIndex;
  } else if (level.order === 6 && pressure >= 4) {
    const blueIndex = pile.indexOf("blue");
    if (blueIndex >= 0) drawIndex = blueIndex;
  }
  const [drawn] = pile.splice(Math.max(0, drawIndex), 1);

  let reserve = state.reserve;
  const poisonEmergency = level.order === 4 && board.filter((bubble) => bubble.poison).length >= 5;
  const pressureEmergency = level.order === 6 && pressure >= 4;
  const coreEmergency = level.order === 9 && shot >= 5 && board.some((bubble) => bubble.core);
  const eggEmergency = level.order === 10 && phase === 2 && board.some((bubble) => bubble.egg && (bubble.countdown ?? 3) <= 1);
  if (poisonEmergency || pressureEmergency || coreEmergency || eggEmergency) {
    const preferredIndex = pressureEmergency && pile.includes("blue")
      ? pile.indexOf("blue")
      : pile.findIndex((ball) => playableColors.includes(getEquivalentColor(ball) as BubbleColor) || ball === "bomb" || ball === "fire" || ball === "rainbow" || ball === "pierce");
    if (preferredIndex >= 0) {
      const [preferred] = pile.splice(preferredIndex, 1, reserve);
      reserve = preferred;
    }
  }

  return {
    current: state.next,
    next: drawn ?? "red",
    reserve,
    drawPile: pile,
    discardPile: discard,
    guaranteesUsed: state.guaranteesUsed + (shouldGuarantee ? 1 : 0),
  };
}

function BallOrb({ kind, small = false }: { kind: BallKind; small?: boolean }) {
  return (
    <span className={`ball-orb ball-${kind} ${small ? "is-small" : ""}`} aria-hidden="true">
      {kind === "bomb" && <i>✦</i>}
      {kind === "fire" && <i>火</i>}
      {kind === "ice" && <i>冰</i>}
      {kind === "rainbow" && <i>★</i>}
      {kind === "pierce" && <i>➶</i>}
      {kind === "curseWeb" && <i>网</i>}
    </span>
  );
}

function ShooterBall({ kind }: { kind: BallKind }) {
  return (
    <g className={`svg-shooter-ball projectile-${kind}`} aria-label={`当前球：${ballNames[kind]}`}>
      <circle cx={SHOOTER.x} cy={SHOOTER.y} r={SHOOTER_BALL_RADIUS} />
      <circle cx={SHOOTER.x - 10} cy={SHOOTER.y - 12} r="8" fill="rgba(255,255,255,.75)" />
      {!colors.includes(kind as BubbleColor) && (
        <text x={SHOOTER.x} y={SHOOTER.y + 9} textAnchor="middle">
          {kind === "bomb" ? "✦" : kind === "fire" ? "火" : kind === "ice" ? "冰" : kind === "rainbow" ? "★" : kind === "pierce" ? "➶" : "网"}
        </text>
      )}
    </g>
  );
}

function BoardBubbleView({ bubble }: { bubble: BoardBubble }) {
  const { x, y } = bubblePosition(bubble.row, bubble.col);
  return (
    <g
      className={`board-bubble bubble-${bubble.color} ${bubble.webbed ? "is-webbed" : ""} ${bubble.core ? "is-core" : ""} ${bubble.poison ? "is-poison" : ""} ${bubble.frozen ? "is-frozen" : ""} ${bubble.weakpoint ? "is-weakpoint" : ""} ${bubble.boardSpecial ? `is-special special-${bubble.boardSpecial}` : ""}`}
      data-row={bubble.row}
      data-col={bubble.col}
      data-color={bubble.color}
    >
      <circle cx={x} cy={y} r={BUBBLE_RADIUS} fill={`url(#fill-${bubble.color})`} />
      <ellipse cx={x - 8} cy={y - 10} rx="8" ry="12" fill="rgba(255,255,255,.68)" transform={`rotate(35 ${x - 8} ${y - 10})`} />
      {bubble.color === "stone" && <path d={`M${x - 10},${y - 20} l8,12 -7,9 13,12 -5,10`} fill="none" stroke="#1e3858" strokeWidth="3" />}
      {bubble.egg && <text x={x} y={y + 8} textAnchor="middle" className="egg-mark">{bubble.countdown}</text>}
      {bubble.core && <text x={x} y={y + 10} textAnchor="middle" className="core-mark">★</text>}
      {bubble.hidden && <text x={x} y={y + 10} textAnchor="middle" className="hidden-mark">?</text>}
      {bubble.mirror && !bubble.hidden && <text x={x} y={y + 10} textAnchor="middle" className="mirror-mark">◇</text>}
      {bubble.poison && <text x={x} y={y + 8} textAnchor="middle" className="poison-mark">☠</text>}
      {bubble.coin && <text x={x} y={y + 9} textAnchor="middle" className="coin-mark">◆</text>}
      {bubble.chest && <text x={x} y={y + 8} textAnchor="middle" className="chest-mark">宝{bubble.countdown}</text>}
      {bubble.weakpoint && <text x={x} y={y + 10} textAnchor="middle" className="weakpoint-mark">◎</text>}
      {bubble.boardSpecial && <text x={x} y={y + 10} textAnchor="middle" className={`board-special-mark mark-${bubble.boardSpecial}`}>{bubble.boardSpecial === "bomb" ? "✦" : bubble.boardSpecial === "rainbow" ? "★" : "↡"}</text>}
      {bubble.slime && <text x={x} y={y + 9} textAnchor="middle" className="slime-mark">≈</text>}
      {bubble.chain && <path d={`M${x - 23},${y - 13} C${x - 5},${y - 22} ${x + 5},${y + 22} ${x + 23},${y + 13}`} className="chain-mark" />}
      {bubble.frozen && <path d={`M${x},${y - 23} V${y + 23} M${x - 20},${y - 11} L${x + 20},${y + 11} M${x + 20},${y - 11} L${x - 20},${y + 11}`} className="frozen-mark" />}
      {bubble.webbed && (
        <g className="web-mark" stroke="white" strokeWidth="2" fill="none">
          <circle cx={x} cy={y} r={BUBBLE_RADIUS - 3} />
          <path d={`M${x - 22},${y} H${x + 22} M${x},${y - 22} V${y + 22} M${x - 17},${y - 17} L${x + 17},${y + 17} M${x + 17},${y - 17} L${x - 17},${y + 17}`} />
          <circle cx={x} cy={y} r="11" />
        </g>
      )}
    </g>
  );
}

export default function Home() {
  const [levelIndex, setLevelIndex] = useState(0);
  const levels = chapterLevels?.length ? chapterLevels : [initialChapterLevel];
  const level = levels[levelIndex] ?? initialChapterLevel;
  const [runBag, setRunBag] = useState<BallKind[]>(baseBag);
  const [runRelics, setRunRelics] = useState<string[]>([]);
  const [goldState, setGoldState] = useState<RunGoldState>(() => createRunGoldState());
  const gold = goldState.currentGold;
  const [metaCurrency, setMetaCurrency] = useState(0);
  const [premiumCurrency, setPremiumCurrency] = useState(0);
  const [battleCoinBubbleCountsByPhase, setBattleCoinBubbleCountsByPhase] = useState<number[]>([]);
  const [battleRelicGold, setBattleRelicGold] = useState(0);
  const [battleExtraGold, setBattleExtraGold] = useState(0);
  const [battleBoardClearCount, setBattleBoardClearCount] = useState(0);
  const [lastBattleGold, setLastBattleGold] = useState<BattleGoldBreakdown | null>(null);
  const [goldFeedback, setGoldFeedback] = useState<{ delta: number; sequence: number } | null>(null);
  const [initialBoard] = useState(() => makeInitialBoard(initialChapterLevel, baseBag));
  const [board, setBoard] = useState<BoardBubble[]>(initialBoard);
  const [boardOffsetY, setBoardOffsetY] = useState(() => getBoardOffsetY(initialBoard, 0));
  const [pressureDepthRows, setPressureDepthRows] = useState(0);
  const [routeFlow, setRouteFlow] = useState<RouteFlowState>(() => createInitialRouteFlow());
  const [routeSelectionOpen, setRouteSelectionOpen] = useState(true);
  const [routeTargetIndex, setRouteTargetIndex] = useState(0);
  const [focusedRouteId, setFocusedRouteId] = useState<string | undefined>();
  const [activeRouteId, setActiveRouteId] = useState<string | undefined>();
  const [activeRouteSeed, setActiveRouteSeed] = useState<number | undefined>();
  const [routeServiceRouteId, setRouteServiceRouteId] = useState<string | undefined>();
  const [ballBag, setBallBag] = useState<BallBagState>(() => makeBallBag(baseBag, initialChapterLevel, board, 1));
  const [hpProfile, setHpProfile] = useState<HpProfileVersion>("v1");
  const [enemyState, setEnemyState] = useState<EnemyCombatState>(() => createEnemyCombatState(initialChapterLevel.id, "v1"));
  const [health, setHealth] = useState<PlayerHealthState>(() => createPlayerHealthState());
  const [score, setScore] = useState(0);
  const [shotCount, setShotCount] = useState(0);
  const [shotBudget, setShotBudget] = useState<ShotBudgetState>(() => initializeShotBudget(initialChapterLevel.id));
  const [pressure, setPressure] = useState(0);
  const [misses, setMisses] = useState(0);
  const [skillCharge, setSkillCharge] = useState(0);
  const [skillLoaded, setSkillLoaded] = useState(false);
  const [vulnerableShots, setVulnerableShots] = useState(0);
  const [enemyStatuses, setEnemyStatuses] = useState<RuntimeStatus[]>([]);
  const [aim, setAim] = useState<Point>({ x: 198, y: 260 });
  const [projectile, setProjectile] = useState<{ point: Point; kind: BallKind } | null>(null);
  const [busy, setBusy] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [message, setMessage] = useState("拖动瞄准线，松开发射泡泡");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [result, setResult] = useState<BattleResult>("playing");
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [chapterComplete, setChapterComplete] = useState(false);
  const [failureState, setFailureState] = useState<FailureState | null>(null);
  const [runSettlement, setRunSettlement] = useState<RunSettlement | null>(null);
  const [enemyIntentDelay, setEnemyIntentDelay] = useState(0);
  const [enemyIntentClock, setEnemyIntentClock] = useState(0);
  const [phaseIntentCount, setPhaseIntentCount] = useState(0);
  const [enemyIntentCount, setEnemyIntentCount] = useState(0);
  const [enemyAttackCount, setEnemyAttackCount] = useState(0);
  const [bossMissWebTriggers, setBossMissWebTriggers] = useState(0);
  const [reserveLockShots, setReserveLockShots] = useState(0);
  const [bossTransition, setBossTransition] = useState<{ from: number; to: number } | null>(null);
  const [runDamageTaken, setRunDamageTaken] = useState(0);
  const [maxSingleDrop, setMaxSingleDrop] = useState(0);
  const [bagChanges, setBagChanges] = useState(0);
  const [pressureFeedback, setPressureFeedback] = useState<PressureFeedback | null>(null);
  const [dropFeedback, setDropFeedback] = useState<DropFeedback | null>(null);
  const [saveLoaded, setSaveLoaded] = useState(false);
  const animationRef = useRef<number | null>(null);
  const pressureFxTimerRef = useRef<number | null>(null);
  const dropFxTimerRef = useRef<number | null>(null);
  const bossTransitionTimerRef = useRef<number | null>(null);
  const goldFeedbackTimerRef = useRef<number | null>(null);
  const goldFeedbackSequenceRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const battleSeedRef = useRef(1);
  const battleIdRef = useRef("CH1_01-battle-1");
  const routeDecisionStartedRef = useRef(0);
  const processedDamageIdsRef = useRef<Set<string>>(new Set());
  const processedReviveIdsRef = useRef<Set<string>>(new Set());
  const processedPressureResolveIdsRef = useRef<Set<string>>(new Set());
  const processedRelicTriggersRef = useRef<Set<string>>(new Set());
  const shownIntentKeyRef = useRef("");
  const battleTelemetryRef = useRef<BattleTelemetry>(createBattleTelemetry({
    state: createEnemyCombatState(initialChapterLevel.id, "v1"),
    playerHp: survivalConfig.playerHealth.defaultMaxHp,
    ballBagSize: baseBag.length,
    specialBallCount: baseBag.filter((kind) => !colors.includes(kind as BubbleColor)).length,
    relicCount: 0,
  }));
  const [lastCombatTelemetry, setLastCombatTelemetry] = useState<ReturnType<typeof finishBattleTelemetry> | null>(null);
  const [combatDebug, setCombatDebug] = useState({ elapsedSec: 0, totalDamage: 0, pressureTriggerCount: 0, overflowCount: 0, playerDamageTaken: 0 });

  const enemyHp = enemyState.hp;
  const activeRoute = getRouteById(activeRouteId);
  const routeOptions = useMemo(() => getRouteCardsByIds(routeFlow.pendingRouteOptions), [routeFlow.pendingRouteOptions]);
  const focusedRoute = routeOptions.find((route) => route.routeId === focusedRouteId);
  const routeService = getRouteById(routeServiceRouteId);
  const routeServiceSession = routeFlow.pendingService?.routeId === routeServiceRouteId ? routeFlow.pendingService : undefined;
  const routeServiceOffers = getRouteServiceOffers(routeServiceSession);
  const progressSlotIndex = routeSelectionOpen ? routeTargetIndex + 1 : level.order;
  const chapterProgress = getChapterProgress(progressSlotIndex);
  const phase = enemyState.phaseIndex + 1;
  const enemyConfig = getEnemyHpConfig(level.id, hpProfile, enemyState.enemyId);
  const pressureMax = getActiveBossPhaseConfig(enemyState)?.pressureMax ?? enemyConfig.pressureMax ?? level.pressureMax;
  const intentPreview = getIntentPreview(enemyState, phaseIntentCount, enemyIntentClock, enemyIntentDelay);
  const intentCountdown = intentPreview.shotsRemaining;
  const survivalRules = getLevelSurvivalRules(level.order, level.nodeType);
  const levelPressureConfig = loadPressureOverflowConfig(undefined, level.pressureOverflowOverride).config;
  const levelOverflowDamageCap = level.pressureOverflowOverride?.damageCap ?? survivalRules.overflowDamageCap;
  const nextEnemyDamage = getConfiguredIntentDamage(intentPreview.action);
  const burnStatus = enemyStatuses.find((status) => status.statusId === "STATUS_BURN_ENEMY");
  const poisonStatus = health.statuses.find((status) => status.id === "STATUS_POISON_PLAYER");
  const predictedCollapseRow = getPressureCollapseRow(boardOffsetY);
  const predictedPressureRows = Math.max(1, Math.floor(levelPressureConfig.boardDropRows));
  const predictedOverflow = calculatePressureOverflow(
    board.filter((bubble) => bubble.row + predictedPressureRows > predictedCollapseRow),
    health.overflowCountThisBattle,
    levelOverflowDamageCap,
    levelPressureConfig,
  );
  const survivalUi = createSurvivalUiSnapshot({
    health,
    nextEnemyDamage,
    enemyIntentShotsRemaining: intentCountdown + enemyIntentDelay,
    overflowWarning: predictedOverflow.overflowBubbleIds.length > 0,
    predictedOverflowDamage: predictedOverflow.cappedDamage,
  });
  const currentShotKind: BallKind = hasRelic(runRelics, "RELIC_PRISM") && (shotCount + 1) % 6 === 0 ? "rainbow" : ballBag.current;
  const preview = useMemo(() => calculateTrajectory(board, aim, boardOffsetY, currentShotKind === "pierce"), [board, aim, boardOffsetY, currentShotKind]);
  const coreAlive = board.some((bubble) => bubble.core);
  const mechanismCount = board.filter((bubble) => bubble.color === "stone" || bubble.webbed || bubble.chain || bubble.poison || bubble.hidden || bubble.frozen || bubble.egg).length;
  const rewardCards = getRoutedRewardOptions(level, activeRoute);
  const manualReviveAvailable = result === "downed" && failureState
    ? !shotBudget.continueUsed && canManualRevive(health, failureState.reason)
    : false;
  const shotLimitContinueAvailable = result === "downed"
    && failureState?.reason === "SHOT_LIMIT_EXHAUSTED"
    && !shotBudget.continueUsed
    && health.reviveCountThisBattle === 0;
  const shotWarningLevel = getShotWarningLevel(shotBudget);
  const shotBudgetConfig = getShotBudgetConfig(level.id);
  const reviveHpPreview = Math.ceil(health.maxHp * survivalConfig.revive.restoreHpPercent);
  const reviveShieldPreview = Math.min(health.shieldMax, Math.floor(health.maxHp * survivalConfig.revive.grantShieldPercent));
  const effectiveDamagePerShot = shotCount
    ? combatDebug.totalDamage / shotCount
    : 0;
  const remainingEnemyEhp = enemyState.hp + (enemyState.nodeType === "BOSS"
    ? enemyState.phases.reduce((sum, item, index) => sum + (index >= enemyState.phaseIndex ? item.shield : 0), 0)
    : enemyState.shield);
  const estimatedRemainingShots = Math.ceil(remainingEnemyEhp / Math.max(1, effectiveDamagePerShot || enemyConfig.expectedEffectiveDamagePerShot));
  useEffect(() => {
    const action = intentPreview.action;
    if (!action || result !== "playing") return;
    const key = `${battleIdRef.current}:${enemyState.phaseIndex}:${phaseIntentCount}:${action.actionId}`;
    if (shownIntentKeyRef.current === key) return;
    shownIntentKeyRef.current = key;
    window.dispatchEvent(new CustomEvent("enemy_intent_shown", { detail: {
      run_id: battleIdRef.current.split("-battle-")[0], battle_id: battleIdRef.current, level_id: level.id,
      source_id: action.actionId, target_id: "PLAYER", shot_transaction_id: "",
      effect_value: getConfiguredIntentDamage(action), result: "SHOWN",
    } }));
  }, [enemyState.phaseIndex, intentPreview.action, level.id, phaseIntentCount, result]);
  const emitShotBudgetEvent = (
    eventName: string,
    before: ShotBudgetState,
    after: ShotBudgetState,
    extra: Record<string, unknown> = {},
  ) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: {
      battle_id: battleIdRef.current,
      level_id: level.id,
      node_type: shotBudgetConfig.nodeType,
      enemy_id: enemyState.enemyId,
      boss_phase_id: enemyState.phases[enemyState.phaseIndex]?.phaseId,
      base_shot_limit: after.baseShotLimit,
      pre_battle_bonus_shots: after.preBattleBonusShots,
      initial_shots: after.initialShots,
      remaining_shots_before: before.remainingShots,
      remaining_shots_after: after.remainingShots,
      consumed_shots_total: after.consumedShots,
      runtime_granted_total: after.runtimeGrantedShots,
      phase_granted_total: after.phaseGrantedShots,
      ...extra,
    } }));
  };

  const emitCoreEvent = (
    eventName: string,
    detail: { sourceId: string; targetId: string; shotTransactionId: string; effectValue: number; result: string; [key: string]: unknown },
  ) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: {
      run_id: battleIdRef.current.split("-battle-")[0],
      battle_id: battleIdRef.current,
      level_id: level.id,
      source_id: detail.sourceId,
      target_id: detail.targetId,
      shot_transaction_id: detail.shotTransactionId,
      effect_value: detail.effectValue,
      result: detail.result,
      ...detail,
    } }));
  };

  useEffect(() => {
    routeDecisionStartedRef.current = nowMs();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const persistentCurrencyRaw = window.localStorage.getItem(PERSISTENT_CURRENCY_SAVE_KEY);
        if (persistentCurrencyRaw) {
          const persistentCurrency = JSON.parse(persistentCurrencyRaw) as { metaCurrency?: number; premiumCurrency?: number };
          setMetaCurrency(Math.max(0, Math.floor(persistentCurrency.metaCurrency ?? 0)));
          setPremiumCurrency(Math.max(0, Math.floor(persistentCurrency.premiumCurrency ?? 0)));
        }
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<SavedDemoRun>;
          const restoredIndex = Math.max(0, Math.min(chapterLevels.length - 1, saved.levelIndex ?? 0));
          const restoredLevel = chapterLevels[restoredIndex] ?? initialChapterLevel;
          const restoredProfile: HpProfileVersion = saved.hpProfile === "legacy" || (!saved.hpProfile && !saved.enemyState && typeof saved.enemyHp === "number") ? "legacy" : "v1";
          if (Array.isArray(saved.runBag)) setRunBag(saved.runBag);
          if (Array.isArray(saved.runRelics)) setRunRelics(saved.runRelics);
          setGoldState(restoreRunGoldState(saved.goldState, saved.gold));
          setBattleCoinBubbleCountsByPhase(saved.battleCoinBubbleCountsByPhase ?? []);
          setBattleRelicGold(saved.battleRelicGold ?? 0);
          setBattleExtraGold(saved.battleExtraGold ?? 0);
          setBattleBoardClearCount(saved.battleBoardClearCount ?? 0);
          setLastBattleGold(saved.lastBattleGold ?? null);
          if (Array.isArray(saved.board) && saved.board.length) {
            setBoard(saved.board);
            const restoredPressureDepth = saved.pressureDepthRows ?? 0;
            setPressureDepthRows(restoredPressureDepth);
            setBoardOffsetY(typeof saved.boardOffsetY === "number"
              ? saved.boardOffsetY
              : getBoardOffsetY(saved.board, restoredPressureDepth));
          }
          if (saved.ballBag) setBallBag(saved.ballBag);
          setHpProfile(restoredProfile);
          const restoredEnemy = restoreEnemyCombatState(saved.enemyState, restoredLevel.id, restoredProfile);
          setEnemyState(!saved.enemyState && restoredEnemy.nodeType !== "BOSS" && typeof saved.enemyHp === "number"
            ? { ...restoredEnemy, hp: Math.max(0, Math.min(restoredEnemy.maxHp, saved.enemyHp)), defeated: saved.enemyHp <= 0 }
            : restoredEnemy);
          if (typeof saved.pressure === "number") setPressure(saved.pressure);
          if (typeof saved.shotCount === "number") setShotCount(saved.shotCount);
          setShotBudget(restoreShotBudgetState(saved.shotBudget, restoredLevel.id, saved.shotCount ?? 0));
          if (typeof saved.enemyIntentDelay === "number") setEnemyIntentDelay(saved.enemyIntentDelay);
          setEnemyIntentClock(saved.enemyIntentClock ?? 0);
          setPhaseIntentCount(saved.phaseIntentCount ?? 0);
          setEnemyIntentCount(saved.enemyIntentCount ?? 0);
          setEnemyAttackCount(saved.enemyAttackCount ?? 0);
          setBossMissWebTriggers(saved.bossMissWebTriggers ?? 0);
          setReserveLockShots(saved.reserveLockShots ?? 0);
          setEnemyStatuses(Array.isArray(saved.enemyStatuses) ? saved.enemyStatuses.map((status) => ({ ...status })) : []);
          if (saved.result && ["playing", "win", "downed", "failed"].includes(saved.result)) setResult(saved.result);
          setLevelIndex(restoredIndex);
          setHealth(createPlayerHealthState(saved.health));
          setFailureState(saved.failureState ?? null);
          setRunSettlement(saved.runSettlement ?? null);
          setRunDamageTaken(saved.runDamageTaken ?? 0);
          setMaxSingleDrop(saved.maxSingleDrop ?? 0);
          setBagChanges(saved.bagChanges ?? 0);
          const restoredRouteFlow = restoreRouteFlowState(saved.routeFlow);
          setRouteFlow(restoredRouteFlow);
          setRouteSelectionOpen(saved.routeSelectionOpen ?? false);
          setRouteTargetIndex(Math.max(0, Math.min(chapterLevels.length - 1, saved.routeTargetIndex ?? restoredIndex)));
          setFocusedRouteId(saved.focusedRouteId);
          setActiveRouteId(saved.activeRouteId);
          setActiveRouteSeed(saved.activeRouteSeed);
          setRouteServiceRouteId(saved.routeServiceRouteId ?? restoredRouteFlow.pendingService?.routeId);
          battleIdRef.current = saved.battleId ?? `${restoredLevel.id}-restored`;
          processedDamageIdsRef.current = new Set(saved.processedDamageIds ?? []);
          processedReviveIdsRef.current = new Set(saved.processedReviveIds ?? []);
          processedPressureResolveIdsRef.current = new Set(saved.processedPressureResolveIds ?? []);
          processedRelicTriggersRef.current = new Set(saved.processedRelicTriggers ?? []);
          setHelpOpen(false);
        }
      } catch {
        window.localStorage.removeItem(SAVE_KEY);
      }
      setSaveLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!saveLoaded) return;
    window.localStorage.setItem(PERSISTENT_CURRENCY_SAVE_KEY, JSON.stringify({ metaCurrency, premiumCurrency }));
  }, [saveLoaded, metaCurrency, premiumCurrency]);

  useEffect(() => {
    if (!saveLoaded) return;
    const saved: SavedDemoRun = {
      version: 5,
      levelIndex,
      health,
      runBag,
      runRelics,
      gold,
      goldState,
      battleCoinBubbleCountsByPhase,
      battleRelicGold,
      battleExtraGold,
      battleBoardClearCount,
      lastBattleGold,
      board,
      boardOffsetY,
      pressureDepthRows,
      ballBag,
      enemyHp,
      enemyState,
      hpProfile,
      pressure,
      shotCount,
      shotBudget,
      enemyIntentDelay,
      enemyIntentClock,
      phaseIntentCount,
      enemyIntentCount,
      enemyAttackCount,
      bossMissWebTriggers,
      reserveLockShots,
      enemyStatuses,
      result,
      failureState,
      runSettlement,
      processedDamageIds: [...processedDamageIdsRef.current],
      processedReviveIds: [...processedReviveIdsRef.current],
      processedPressureResolveIds: [...processedPressureResolveIdsRef.current],
      processedRelicTriggers: [...processedRelicTriggersRef.current],
      battleId: battleIdRef.current,
      runDamageTaken,
      maxSingleDrop,
      bagChanges,
      routeFlow,
      routeSelectionOpen,
      routeTargetIndex,
      focusedRouteId,
      activeRouteId,
      activeRouteSeed,
      routeServiceRouteId,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  }, [saveLoaded, levelIndex, health, runBag, runRelics, gold, goldState, battleCoinBubbleCountsByPhase, battleRelicGold, battleExtraGold, battleBoardClearCount, lastBattleGold, board, boardOffsetY, pressureDepthRows, ballBag, enemyHp, enemyState, hpProfile, pressure, shotCount, shotBudget, enemyIntentDelay, enemyIntentClock, phaseIntentCount, enemyIntentCount, enemyAttackCount, bossMissWebTriggers, reserveLockShots, enemyStatuses, result, failureState, runSettlement, runDamageTaken, maxSingleDrop, bagChanges, routeFlow, routeSelectionOpen, routeTargetIndex, focusedRouteId, activeRouteId, activeRouteSeed, routeServiceRouteId]);

  useEffect(() => () => {
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    if (pressureFxTimerRef.current) window.clearTimeout(pressureFxTimerRef.current);
    if (dropFxTimerRef.current) window.clearTimeout(dropFxTimerRef.current);
    if (bossTransitionTimerRef.current) window.clearTimeout(bossTransitionTimerRef.current);
    if (goldFeedbackTimerRef.current) window.clearTimeout(goldFeedbackTimerRef.current);
  }, []);

  const startLevel = (index: number, options?: {
    bag?: BallKind[];
    health?: PlayerHealthState;
    relics?: string[];
    profile?: HpProfileVersion;
    route?: RouteCardDefinition;
    routeSeed?: number;
    preBattleBonusShots?: number;
    openingShield?: number;
  }) => {
    if (pressureFxTimerRef.current) {
      window.clearTimeout(pressureFxTimerRef.current);
      pressureFxTimerRef.current = null;
    }
    if (bossTransitionTimerRef.current) {
      window.clearTimeout(bossTransitionTimerRef.current);
      bossTransitionTimerRef.current = null;
    }
    if (dropFxTimerRef.current) {
      window.clearTimeout(dropFxTimerRef.current);
      dropFxTimerRef.current = null;
    }
    const nextLevel = levels[index] ?? initialChapterLevel;
    const nextBag = options?.bag ?? runBag;
    const nextOwnedRelics = (options?.relics ?? runRelics).map(normalizeRelicId);
    const nextProfile = options?.profile ?? hpProfile;
    const routeSeed = options?.routeSeed ?? battleSeedRef.current * 1000 + nextLevel.order;
    const routeEncounter = options?.route ? buildRouteEncounter(options.route, routeSeed, nextLevel.order) : null;
    const initialBoard = makeInitialBoard(nextLevel, nextBag, routeEncounter?.templateOrder ?? nextLevel.order);
    let nextBoard = applyRouteEncounterToBoard(initialBoard, routeEncounter, nextLevel, nextBag);
    const openingObstacleCount = (hasRelic(nextOwnedRelics, "RELIC_POWDER_BAG") ? 1 : 0) + (hasRelic(nextOwnedRelics, "RELIC_CURSE_CROWN") ? 2 : 0);
    if (openingObstacleCount > 0) {
      const obstacleIds = new Set(nextBoard
        .filter((bubble) => regularColor(bubble.color) && !bubble.core && !bubble.coin && !bubble.boardSpecial)
        .sort((a, b) => seededUnit(`${nextLevel.id}-relic-obstacle-${a.id}`) - seededUnit(`${nextLevel.id}-relic-obstacle-${b.id}`))
        .slice(0, openingObstacleCount)
        .map((bubble) => bubble.id));
      nextBoard = nextBoard.map((bubble) => obstacleIds.has(bubble.id) ? { ...bubble, color: "stone" } : bubble);
    }
    const enemyOverrideId = options?.route ? routeEnemyIds[options.route.enemyPoolId] : undefined;
    const nextEnemyState = applyEnemyHpMultiplier(createEnemyCombatState(nextLevel.id, nextProfile, enemyOverrideId), routeEncounter?.enemyHpMultiplier ?? 1);
    const nextShotBudget = initializeShotBudget(nextLevel.id, (hasRelic(nextOwnedRelics, "RELIC_RESERVE_AMMO") ? 2 : 0) + (options?.preBattleBonusShots ?? 0));
    battleSeedRef.current += 1;
    battleIdRef.current = `${nextLevel.id}-battle-${battleSeedRef.current}`;
    processedDamageIdsRef.current = new Set();
    processedReviveIdsRef.current = new Set();
    processedPressureResolveIdsRef.current = new Set();
    processedRelicTriggersRef.current = new Set();
    shownIntentKeyRef.current = "";
    setLevelIndex(index);
    setActiveRouteId(options?.route?.routeId);
    setActiveRouteSeed(options?.route ? routeSeed : undefined);
    setBoard(nextBoard);
    setBoardOffsetY(getBoardOffsetY(nextBoard, 0));
    setPressureDepthRows(0);
    setBallBag(makeBallBag(nextBag, nextLevel, nextBoard, battleSeedRef.current));
    setHpProfile(nextProfile);
    setEnemyState(nextEnemyState);
    let nextHealth = beginBattleSurvival(options?.health ?? health);
    if ((options?.openingShield ?? 0) > 0) nextHealth = addShield(nextHealth, options?.openingShield ?? 0).state;
    if (hasRelic(nextOwnedRelics, "RELIC_STONE_SHELL")) nextHealth = addShield(nextHealth, 8).state;
    setHealth(nextHealth);
    setScore(0);
    setBattleCoinBubbleCountsByPhase([]);
    setBattleRelicGold(0);
    setBattleExtraGold(0);
    setBattleBoardClearCount(0);
    setLastBattleGold(null);
    setShotCount(0);
    setShotBudget(nextShotBudget);
    setPressure(routeEncounter?.startingPressure ?? 0);
    setMisses(0);
    setSkillCharge(0);
    setSkillLoaded(false);
    setVulnerableShots(0);
    setBusy(false);
    setSwapped(false);
    setProjectile(null);
    setMessage(options?.route ? `${options.route.name}：${nextLevel.name}出现了，${options.route.uiSummary.riskText}` : `${nextLevel.name}出现了：${nextLevel.mechanic}`);
    setResult("playing");
    setSelectedReward(null);
    setSettingsOpen(false);
    setChapterComplete(false);
    setFailureState(null);
    setRunSettlement(null);
    setEnemyIntentDelay(0);
    setEnemyIntentClock(0);
    setPhaseIntentCount(0);
    setEnemyIntentCount(0);
    setEnemyAttackCount(0);
    setBossMissWebTriggers(0);
    setReserveLockShots(0);
    setEnemyStatuses([]);
    setBossTransition(null);
    battleTelemetryRef.current = createBattleTelemetry({
      state: nextEnemyState,
      playerHp: nextHealth.currentHp,
      ballBagSize: nextBag.length,
      specialBallCount: nextBag.filter((kind) => !colors.includes(kind as BubbleColor)).length,
      relicCount: (options?.relics ?? runRelics).length,
    });
    window.dispatchEvent(new CustomEvent("ON_COMBAT_CONTROL_GRANTED", { detail: { levelId: nextLevel.id, enemyId: nextEnemyState.enemyId, hpProfileVersion: nextProfile } }));
    window.dispatchEvent(new CustomEvent("route_encounter_started", { detail: {
      run_id: battleIdRef.current,
      chapter_id: "CHAPTER_1",
      next_slot_index: nextLevel.order,
      selected_route_id: options?.route?.routeId,
      selected_route_archetype: options?.route?.primaryArchetype,
      difficulty_rating: options?.route?.difficultyRating,
      player_hp_percent: nextHealth.currentHp / Math.max(1, nextHealth.maxHp),
      gold,
      ball_bag_size: nextBag.length,
      relic_count: (options?.relics ?? runRelics).length,
    } }));
    window.dispatchEvent(new CustomEvent("shot_budget_initialized", { detail: {
      battle_id: battleIdRef.current, level_id: nextLevel.id, node_type: getShotBudgetConfig(nextLevel.id).nodeType,
      base_shot_limit: nextShotBudget.baseShotLimit, pre_battle_bonus_shots: nextShotBudget.preBattleBonusShots,
      initial_shots: nextShotBudget.initialShots, remaining_shots_after: nextShotBudget.remainingShots,
    } }));
    window.dispatchEvent(new CustomEvent("ON_SHOT_BUDGET_INITIALIZED", { detail: nextShotBudget }));
    setLastCombatTelemetry(null);
    setCombatDebug({ elapsedSec: 0, totalDamage: 0, pressureTriggerCount: 0, overflowCount: 0, playerDamageTaken: 0 });
    setPressureFeedback(null);
    setDropFeedback(null);
  };

  const openRouteSelection = (
    targetIndex: number,
    bagForRoute: BallKind[],
    healthForRoute: PlayerHealthState,
    relicsForRoute: string[],
    goldForRoute = gold,
    flowForGeneration: RouteFlowState = routeFlow,
  ) => {
    const nextLevel = levels[targetIndex] ?? initialChapterLevel;
    const nextSlotIndex = targetIndex + 1;
    const seed = battleSeedRef.current * 1009 + nextSlotIndex * 97 + flowForGeneration.routeHistory.length;
    const tags = [
      bagForRoute.includes("fire") ? "FIRE" : "",
      bagForRoute.includes("rainbow") ? "RAINBOW" : "",
      bagForRoute.includes("bomb") ? "BOMB" : "",
    ].filter(Boolean);
    const request: RouteGenerationRequest = {
      runId: battleIdRef.current.split("-battle-")[0] ?? "CH1-RUN",
      seed,
      chapterId: "CHAPTER_1",
      completedSlotIndex: targetIndex,
      nextSlotIndex,
      nextNodeType: getSlotNodeType(nextSlotIndex),
      playerHpPercent: healthForRoute.currentHp / Math.max(1, healthForRoute.maxHp),
      gold: goldForRoute,
      ballBagSummary: {
        size: bagForRoute.length,
        specialCount: bagForRoute.filter((ball) => !colors.includes(ball as BubbleColor)).length,
        tags,
      },
      relicTags: relicsForRoute,
      recentEnemyFamilies: flowForGeneration.recentEnemyFamilies,
      recentRouteArchetypes: flowForGeneration.recentRouteArchetypes,
      recentTemplateFamilyIds: flowForGeneration.recentTemplateFamilyIds,
      fixedBossId: nextLevel.nodeType === "BOSS_BATTLE" ? "BOSS_SPIDER_QUEEN" : undefined,
      nonCombatState: flowForGeneration,
    };
    const generated = generateRouteOptions(request);
    if (flowForGeneration.standaloneNodeCountThisChapter >= 2) window.dispatchEvent(new CustomEvent("standalone_node_cap_reached", { detail: {
      run_id: battleIdRef.current, chapter_id: "CHAPTER_1", next_slot_index: nextSlotIndex,
    } }));
    setRouteFlow({
      ...flowForGeneration,
      currentSlotIndex: targetIndex,
      pendingRouteGenerationId: generated.generationId,
      pendingRouteSeed: generated.seed,
      pendingRouteOptions: generated.options.map((route) => route.routeId),
      pendingService: undefined,
    });
    setRouteTargetIndex(targetIndex);
    setFocusedRouteId(undefined);
    setRouteSelectionOpen(true);
    setRouteServiceRouteId(undefined);
    setResult("playing");
    routeDecisionStartedRef.current = nowMs();
    window.dispatchEvent(new CustomEvent("route_option_generated", { detail: {
      run_id: battleIdRef.current,
      chapter_id: "CHAPTER_1",
      completed_slot_index: targetIndex,
      next_slot_index: nextSlotIndex,
      next_node_type: request.nextNodeType,
      generation_id: generated.generationId,
      seed: generated.seed,
      route_option_ids: generated.options.map((route) => route.routeId),
      route_archetypes: generated.options.map((route) => route.primaryArchetype),
      player_hp_percent: request.playerHpPercent,
      gold: goldForRoute,
      ball_bag_size: bagForRoute.length,
      relic_count: relicsForRoute.length,
      fallback_used: generated.fallbackUsed,
      validation_warnings: generated.validationWarnings,
    } }));
  };

  const focusRoute = (route: RouteCardDefinition) => {
    setFocusedRouteId(route.routeId);
    window.dispatchEvent(new CustomEvent("route_option_focused", { detail: {
      run_id: battleIdRef.current,
      generation_id: routeFlow.pendingRouteGenerationId,
      route_id: route.routeId,
      route_archetype: route.primaryArchetype,
      next_slot_index: routeTargetIndex + 1,
    } }));
  };

  const makeRouteServiceContext = (flow: RouteFlowState = routeFlow): RouteServiceContext => ({
    currentHp: health.currentHp,
    maxHp: health.maxHp,
    shield: health.shield,
    shieldMax: health.shieldMax,
    gold,
    ballBag: runBag,
    relics: runRelics.map(normalizeRelicId),
    pendingEffects: flow.pendingEffects,
  });

  const emitGoldTransaction = (transactionId: string, amount: number, source?: string, sink?: string, balanceAfter = gold) => {
    if (goldFeedbackTimerRef.current) window.clearTimeout(goldFeedbackTimerRef.current);
    goldFeedbackSequenceRef.current += 1;
    setGoldFeedback({ delta: amount, sequence: goldFeedbackSequenceRef.current });
    goldFeedbackTimerRef.current = window.setTimeout(() => {
      setGoldFeedback(null);
      goldFeedbackTimerRef.current = null;
    }, 1100);
    window.dispatchEvent(new CustomEvent("gold_transaction", { detail: {
      run_id: battleIdRef.current.split("-battle-")[0],
      chapter_id: "CHAPTER_1",
      battle_id: battleIdRef.current,
      level_id: level.id,
      transaction_id: transactionId,
      amount,
      gold_before: balanceAfter - amount,
      gold_delta: amount,
      gold_after: balanceAfter,
      source_type: source,
      sink_type: sink,
      balance_after: balanceAfter,
    } }));
    if (sink === "ROUTE_TOLL") window.dispatchEvent(new CustomEvent("route_gold_cost_paid", { detail: {
      run_id: battleIdRef.current.split("-battle-")[0], chapter_id: "CHAPTER_1", level_id: level.id,
      battle_id: battleIdRef.current, transaction_id: transactionId,
      gold_before: balanceAfter - amount, gold_delta: amount, gold_after: balanceAfter,
      source_id: "ROUTE_TOLL", sink_type: sink,
    } }));
  };

  const applyRouteServiceOffer = (offerId: string) => {
    if (!routeService || !routeServiceSession) return;
    const offer = routeServiceOffers.find((item) => item.offerId === offerId);
    if (!offer) return;
    let nextGoldState = goldState;
    if (routeService.serviceType === "SHOP" && offer.price > 0) {
      const sink = getShopSinkType(offerId);
      if (!sink) return;
      const transactionId = `${routeServiceSession.sessionId}-purchase-${offerId}`;
      const transaction = applyGoldTransaction(goldState, { transactionId, amount: -offer.price, sink });
      if (!transaction.applied) return;
      nextGoldState = transaction.state;
    }
    const beforeBag = runBag.join("|");
    const resolved = resolveRouteServiceAction(routeServiceSession, makeRouteServiceContext(), offerId);
    if (resolved.error) return;
    if (routeService.serviceType === "SHOP" && offer.price > 0) {
      const sink = getShopSinkType(offerId);
      emitGoldTransaction(`${routeServiceSession.sessionId}-purchase-${offerId}`, -offer.price, undefined, sink, nextGoldState.currentGold);
    }
    if (routeService.serviceType === "SHOP" && offerId === "SHOP_LEAVE_GRANT_3") {
      const transactionId = `${routeServiceSession.sessionId}-low-gold-grant`;
      const transaction = applyGoldTransaction(nextGoldState, { transactionId, amount: 3, source: "EVENT" });
      if (transaction.applied) {
        nextGoldState = transaction.state;
        emitGoldTransaction(transactionId, 3, "EVENT", undefined, nextGoldState.currentGold);
      }
    }
    const nextBag = resolved.context.ballBag as BallKind[];
    setRunBag(nextBag);
    setHealth((state) => ({ ...state, currentHp: resolved.context.currentHp, shield: resolved.context.shield }));
    setGoldState(nextGoldState);
    setRunRelics((resolved.context.relics ?? []).map(normalizeRelicId));
    if (beforeBag !== nextBag.join("|")) setBagChanges((value) => value + 1);
    const nextFlow: RouteFlowState = { ...routeFlow, pendingService: resolved.session, pendingEffects: resolved.context.pendingEffects ?? [] };
    setRouteFlow(nextFlow);
    if (routeService.serviceType === "SHOP") {
      const shopDetail = {
        run_id: battleIdRef.current, chapter_id: "CHAPTER_1", level_id: level.id, route_id: routeService.routeId,
        offer_id: offerId, shop_item_id: offerId, price: resolved.offer?.price ?? 0, shop_price: resolved.offer?.price ?? 0,
        shop_slot: routeServiceSession.offerIds.indexOf(offerId), purchase_index: resolved.session.choicesMade,
        gold_after: nextGoldState.currentGold, balance_after: nextGoldState.currentGold,
      };
      window.dispatchEvent(new CustomEvent("shop_item_purchased", { detail: shopDetail }));
      window.dispatchEvent(new CustomEvent("shop_purchase", { detail: shopDetail }));
    }
    if (routeService.serviceType === "EVENT") window.dispatchEvent(new CustomEvent("event_choice", { detail: {
      run_id: battleIdRef.current, route_id: routeService.routeId, option_id: offerId,
    } }));
  };

  const rerollRouteShop = () => {
    if (!routeServiceSession || routeServiceSession.serviceType !== "SHOP") return;
    const rerolled = rerollRouteServiceSession(routeServiceSession, gold, goldState);
    if (rerolled.error || rerolled.price === undefined) return;
    const transactionId = `${routeServiceSession.sessionId}-reroll-${routeServiceSession.rerollCount + 1}`;
    const transaction = applyGoldTransaction(goldState, { transactionId, amount: -rerolled.price, sink: "SHOP_REROLL" });
    if (!transaction.applied) return;
    setGoldState(transaction.state);
    setRouteFlow((state) => ({ ...state, pendingService: rerolled.session }));
    emitGoldTransaction(transactionId, -rerolled.price, undefined, "SHOP_REROLL", transaction.state.currentGold);
    window.dispatchEvent(new CustomEvent("shop_rerolled", { detail: {
      run_id: battleIdRef.current, route_id: routeServiceSession.routeId,
      chapter_id: "CHAPTER_1", level_id: level.id, reroll_index: rerolled.session.rerollCount,
      reroll_count: rerolled.session.rerollCount, cost: rerolled.price,
      offer_ids: rerolled.session.offerIds, balance_after: transaction.state.currentGold,
    } }));
  };

  const shootMicroChallenge = (targetId: string) => {
    if (!routeServiceSession?.challenge) return;
    const nextSession = resolveMicroChallengeShot(routeServiceSession, targetId);
    if (nextSession === routeServiceSession) return;
    setRouteFlow((state) => ({ ...state, pendingService: nextSession }));
  };

  const completeRouteService = (route: RouteCardDefinition, routeSeed: number, flow: RouteFlowState = routeFlow, contextOverride?: RouteServiceContext) => {
    const activeSession = flow.pendingService?.routeId === route.routeId
      ? flow.pendingService
      : createRouteServiceSession(route, routeSeed, undefined, { currentGold: gold, counters: goldState });
    if (route.serviceType !== "NONE" && route.serviceType !== "SHOP" && !activeSession.completed) return;
    const completedSession = activeSession.completed ? activeSession : { ...activeSession, completed: true };
    const finalized = finalizeRouteService(route, completedSession, contextOverride ?? makeRouteServiceContext(flow));
    const rawServiceContext = route.advancesBattleSlot ? consumeNextBattleEffects(finalized.context) : finalized.context;
    let nextGoldState = goldState;
    const goldDelta = route.serviceType === "SHOP" ? 0 : rawServiceContext.gold - gold;
    if (goldDelta !== 0) {
      const transactionId = `${completedSession.sessionId}-service-gold`;
      const transaction = applyGoldTransaction(goldState, {
        transactionId,
        amount: goldDelta,
        ...(goldDelta > 0 ? { source: "EVENT" as const } : { sink: "EVENT_COST" as const }),
      });
      if (transaction.applied) {
        nextGoldState = transaction.state;
        emitGoldTransaction(transactionId, goldDelta, goldDelta > 0 ? "EVENT" : undefined, goldDelta < 0 ? "EVENT_COST" : undefined, nextGoldState.currentGold);
      }
    }
    const serviceContext = { ...rawServiceContext, gold: nextGoldState.currentGold };
    const nextBag = serviceContext.ballBag as BallKind[];
    const nextRelics = (serviceContext.relics ?? []).map(normalizeRelicId);
    const nextHealth = { ...health, currentHp: serviceContext.currentHp, shield: serviceContext.shield };
    const nextFlow: RouteFlowState = {
      ...flow,
      pendingService: undefined,
      pendingEffects: serviceContext.pendingEffects ?? [],
    };
    setRunBag(nextBag);
    setRunRelics(nextRelics);
    setHealth(nextHealth);
    setGoldState(nextGoldState);
    setRouteFlow(nextFlow);
    setRouteServiceRouteId(undefined);
    if (route.serviceType !== "NONE") {
      window.dispatchEvent(new CustomEvent("service_node_completed", { detail: {
        run_id: battleIdRef.current,
        route_id: route.routeId,
        service_type: route.serviceType,
        next_slot_index: routeTargetIndex + 1,
        advances_battle_slot: route.advancesBattleSlot,
        choices_made: finalized.session.choicesMade,
      } }));
      if (route.serviceType === "MICRO_BUBBLE_CHALLENGE") window.dispatchEvent(new CustomEvent("micro_challenge_completed", { detail: {
        run_id: battleIdRef.current, route_id: route.routeId, score: finalized.session.challenge?.score ?? 0,
        shots_used: (finalized.session.challenge?.shotBudget ?? 3) - (finalized.session.challenge?.shotsRemaining ?? 0),
      } }));
    }
    if (!route.advancesBattleSlot) {
      openRouteSelection(routeTargetIndex, nextBag, nextHealth, nextRelics, serviceContext.gold, nextFlow);
      return;
    }
    window.dispatchEvent(new CustomEvent("ON_NEXT_ENCOUNTER_BUILT", { detail: {
      routeId: route.routeId,
      slotIndex: routeTargetIndex + 1,
      templatePoolId: route.boardTemplatePoolId,
      enemyPoolId: route.enemyPoolId,
    } }));
    startLevel(routeTargetIndex, {
      bag: nextBag,
      health: nextHealth,
      relics: nextRelics,
      route,
      routeSeed,
      openingShield: serviceContext.shield,
      preBattleBonusShots: serviceContext.preBattleBonusShots,
    });
  };

  const chooseFocusedRoute = () => {
    if (!focusedRoute) return;
    const routeSeed = routeFlow.pendingRouteSeed ?? battleSeedRef.current * 1009 + routeTargetIndex;
    const selection = selectRouteOnce({
      state: routeFlow,
      route: focusedRoute,
      slotIndex: routeTargetIndex + 1,
      enemyId: (levels[routeTargetIndex] ?? initialChapterLevel).enemyId,
      selectedAt: nowMs(),
      generationId: routeFlow.pendingRouteGenerationId,
    });
    if (selection.duplicate) return;
    const serviceSession = createRouteServiceSession(focusedRoute, routeSeed, selection.state.pendingService, { currentGold: gold, counters: goldState });
    const selectedFlow = { ...selection.state, pendingService: serviceSession };
    setRouteFlow(selectedFlow);
    setActiveRouteId(focusedRoute.advancesBattleSlot ? focusedRoute.routeId : undefined);
    setActiveRouteSeed(focusedRoute.advancesBattleSlot ? routeSeed : undefined);
    setRouteSelectionOpen(false);
    window.dispatchEvent(new CustomEvent("route_selected", { detail: {
      run_id: battleIdRef.current,
      chapter_id: "CHAPTER_1",
      generation_id: routeFlow.pendingRouteGenerationId,
      seed: routeSeed,
      next_slot_index: routeTargetIndex + 1,
      selected_route_id: focusedRoute.routeId,
      selected_route_archetype: focusedRoute.primaryArchetype,
      difficulty_rating: focusedRoute.difficultyRating,
      risk_tags: focusedRoute.riskTags,
      reward_tags: focusedRoute.rewardTags,
      service_type: focusedRoute.serviceType,
      decision_duration_sec: Math.max(0, (nowMs() - routeDecisionStartedRef.current) / 1000),
    } }));
    if (focusedRoute.serviceType !== "NONE") {
      setRouteServiceRouteId(focusedRoute.routeId);
      window.dispatchEvent(new CustomEvent("service_node_started", { detail: {
        run_id: battleIdRef.current,
        route_id: focusedRoute.routeId,
        service_type: focusedRoute.serviceType,
        next_slot_index: routeTargetIndex + 1,
        advances_battle_slot: focusedRoute.advancesBattleSlot,
      } }));
      if (focusedRoute.serviceType === "SHOP") window.dispatchEvent(new CustomEvent("shop_opened", { detail: {
        run_id: battleIdRef.current, chapter_id: "CHAPTER_1", level_id: level.id,
        route_id: focusedRoute.routeId, balance: gold, gold_before: gold, gold_after: gold,
        offer_ids: serviceSession.offerIds, offer_prices: serviceSession.offerPrices,
      } }));
      if (focusedRoute.serviceType === "MICRO_BUBBLE_CHALLENGE") window.dispatchEvent(new CustomEvent("micro_challenge_started", { detail: {
        run_id: battleIdRef.current, route_id: focusedRoute.routeId, challenge_shot_budget: serviceSession.challenge?.shotBudget ?? 3,
      } }));
      return;
    }
    completeRouteService(focusedRoute, routeSeed, selectedFlow);
  };

  const resetRun = () => {
    setRunBag(baseBag);
    setRunRelics([]);
    setGoldState(createRunGoldState());
    setBattleCoinBubbleCountsByPhase([]);
    setBattleRelicGold(0);
    setBattleExtraGold(0);
    setBattleBoardClearCount(0);
    setLastBattleGold(null);
    setRunDamageTaken(0);
    setMaxSingleDrop(0);
    setBagChanges(0);
    const freshHealth = createPlayerHealthState();
    setHealth(freshHealth);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SAVE_KEY);
      LEGACY_SAVE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    }
    setRouteFlow(createInitialRouteFlow());
    setRouteSelectionOpen(true);
    setRouteTargetIndex(0);
    setFocusedRouteId(undefined);
    setRouteServiceRouteId(undefined);
    routeDecisionStartedRef.current = nowMs();
    startLevel(0, { bag: baseBag, health: freshHealth, relics: [] });
  };

  const resolveShot = (trajectory: Trajectory, firedKind: BallKind, shotTransactionId: string, consumedShotBudget: ShotBudgetState) => {
    const hatchedEggs: BoardBubble[] = [];
    let working: BoardBubble[] = board.flatMap((bubble): BoardBubble[] => {
      const visibility = bubble.hiddenUntil && bubble.hiddenUntil <= shotCount + 1
        ? { hidden: false, hiddenUntil: undefined }
        : { hidden: bubble.hidden, hiddenUntil: bubble.hiddenUntil };
      if (!bubble.egg) return [{ ...bubble, ...visibility }];
      const countdown = (bubble.countdown ?? 1) - 1;
      if (countdown <= 0) {
        hatchedEggs.push(bubble);
        return [];
      }
      return [{ ...bubble, ...visibility, countdown }];
    });
    if (hatchedEggs.length) {
      const webIds = new Set<string>();
      hatchedEggs.forEach((egg) => {
        working
          .filter((bubble) => regularColor(bubble.color) && !bubble.core && !bubble.webbed)
          .sort((a, b) => Math.hypot(a.row - egg.row, a.col - egg.col) - Math.hypot(b.row - egg.row, b.col - egg.col))
          .slice(0, 2)
          .forEach((bubble) => webIds.add(bubble.id));
      });
      working = working.map((bubble) => webIds.has(bubble.id) ? { ...bubble, webbed: true } : bubble);
    }
    working = working
      .map((bubble) => bubble.chest ? { ...bubble, countdown: (bubble.countdown ?? 1) - 1 } : bubble)
      .filter((bubble) => !bubble.chest || (bubble.countdown ?? 0) > 0);
    if (trajectory.hit) {
      working = working.map((bubble) => bubble.id === trajectory.hit?.id
        ? { ...bubble, hidden: false, frozen: firedKind === "fire" || firedKind === "bomb" ? false : bubble.frozen }
        : bubble);
    }
    const snap = findSnapCell(working, trajectory, boardOffsetY);
    const hitColor = trajectory.hit && regularColor(trajectory.hit.color) ? trajectory.hit.color : null;
    const rainbowFallback = snap ? selectRainbowColorForCell(working, snap, runBag, shotCount + 1) : (hitColor ?? "red");
    const equivalentColor = getEquivalentColor(firedKind);
    const firedColor: BubbleColor = firedKind === "rainbow"
      ? rainbowFallback
      : firedKind === "pierce" && snap
        ? copyPierceColor(working, snap, rainbowFallback)
        : equivalentColor && equivalentColor !== "rainbow" && equivalentColor !== "dynamic"
          ? equivalentColor
          : rainbowFallback;
    let cleared: BoardBubble[] = [];
    let dropped: BoardBubble[] = [];
    let matched = false;
    let specialDamage = 0;
    let directMatchClearCount = 0;

    if (firedKind === "curseWeb") {
      const webTargets = working
        .filter((bubble) => !bubble.core && !bubble.webbed && regularColor(bubble.color))
        .sort((a, b) => seededUnit(`${shotTransactionId}-curse-web-${a.id}`) - seededUnit(`${shotTransactionId}-curse-web-${b.id}`))
        .slice(0, 2);
      const targetIds = new Set(webTargets.map((bubble) => bubble.id));
      working = working.map((bubble) => targetIds.has(bubble.id) ? { ...bubble, webbed: true } : bubble);
    } else if (firedKind === "bomb") {
      const center = trajectory.hit ? bubbleScreenPosition(trajectory.hit.row, trajectory.hit.col, boardOffsetY) : trajectory.impact;
      const bombRadius = hasRelic(runRelics, "RELIC_POWDER_BAG") ? X_GAP * 2.35 : X_GAP * 1.35;
      cleared = working.filter((bubble) => {
        const bubbleId = bubble.core ? "BUBBLE_BOSS_CORE" : bubble.color === "stone" ? "BUBBLE_STONE" : `BUBBLE_NORMAL_${String(bubble.color).toUpperCase()}`;
        if (!canBombClearBubble(bubbleId)) return false;
        const point = bubbleScreenPosition(bubble.row, bubble.col, boardOffsetY);
        return Math.hypot(point.x - center.x, point.y - center.y) <= bombRadius;
      });
      const clearIds = expandBoardBombClears(working, new Set(cleared.map((bubble) => bubble.id)));
      cleared = working.filter((bubble) => clearIds.has(bubble.id));
      working = working.filter((bubble) => !clearIds.has(bubble.id));
      specialDamage = 0;
      matched = cleared.length > 0;
    } else if (snap) {
      const placed: BoardBubble = {
        id: `shot-${level.id}-${shotCount + 1}-${snap[0]}-${snap[1]}`,
        row: snap[0],
        col: snap[1],
        color: firedColor,
      };
      working.push(placed);
      const cluster = findColorCluster(working, placed, firedColor);
      if (cluster.length >= 3) {
        matched = true;
        directMatchClearCount = cluster.length;
        let clearIds = new Set(cluster.map((bubble) => bubble.id));
        if (firedKind === "fire" && shouldTriggerFireEffects(cluster.length)) {
          const radiusCells = new Set([keyFor(placed.row, placed.col), ...neighborCells(placed.row, placed.col).map(([r, c]) => keyFor(r, c))]);
          working.forEach((bubble) => {
            if (!bubble.core && bubble.color !== "stone" && radiusCells.has(keyFor(bubble.row, bubble.col))) clearIds.add(bubble.id);
          });
        }
        working.filter((bubble) => bubble.core).forEach((core) => {
          const adjacentClears = neighborCells(core.row, core.col).filter(([row, col]) => {
            const neighbor = working.find((bubble) => bubble.row === row && bubble.col === col);
            return Boolean(neighbor && clearIds.has(neighbor.id));
          }).length;
          if (adjacentClears >= 3) clearIds.add(core.id);
        });
        clearIds = expandBoardBombClears(working, clearIds);
        cleared = working.filter((bubble) => clearIds.has(bubble.id));
        working = working.filter((bubble) => !clearIds.has(bubble.id));
      }
    }

    // 每发都重算顶行连通性，既清理旧存档中的孤岛，也覆盖倒计时对象消失等非消除拓扑变化。
    const floating = removeFloating(working);
    working = floating.kept;
    dropped = floating.dropped;
    const playerBoardClearedThisShot = working.length === 0;
    let nextBossMissWebTriggers = bossMissWebTriggers;
    let missWebAdded = false;
    if (enemyState.nodeType === "BOSS" && enemyState.phaseIndex === 2 && !matched && nextBossMissWebTriggers < 2) {
      const target = working
        .filter((bubble) => regularColor(bubble.color) && !bubble.core && !bubble.webbed)
        .sort((a, b) => seededUnit(`${shotTransactionId}-boss-miss-web-${a.id}`) - seededUnit(`${shotTransactionId}-boss-miss-web-${b.id}`))[0];
      if (target) {
        working = working.map((bubble) => bubble.id === target.id ? { ...bubble, webbed: true } : bubble);
        nextBossMissWebTriggers += 1;
        missWebAdded = true;
      }
    }
    if (hasRelic(runRelics, "RELIC_BURN_CORE") && directMatchClearCount >= 3 && firedColor === "red") {
      const clearedCells = new Set(cleared.flatMap((bubble) => neighborCells(bubble.row, bubble.col).map(([row, col]) => keyFor(row, col))));
      const target = working
        .filter((bubble) => clearedCells.has(keyFor(bubble.row, bubble.col)) && regularColor(bubble.color) && !bubble.core)
        .sort((a, b) => seededUnit(`${shotTransactionId}-burn-core-${a.id}`) - seededUnit(`${shotTransactionId}-burn-core-${b.id}`))[0];
      if (target) working = working.map((bubble) => bubble.id === target.id ? { ...bubble, color: "red" } : bubble);
    }

    const coreCleared = [...cleared, ...dropped].some((bubble) => bubble.core);
    const webCleared = [...cleared, ...dropped].filter((bubble) => bubble.webbed).length;
    const coinCleared = [...cleared, ...dropped].filter((bubble) => bubble.coin).length;
    const chestCleared = [...cleared, ...dropped].some((bubble) => bubble.chest);
    const weakpointCleared = [...cleared, ...dropped].filter((bubble) => bubble.weakpoint).length;
    const mirrorCleared = [...cleared, ...dropped].some((bubble) => bubble.mirror);
    const chargeCleared = [...cleared, ...dropped].filter((bubble) => bubble.boardSpecial === "charge").length;
    const blueMatched = matched && firedColor === "blue";
    const dropDamageType = level.nodeType === "BOSS_BATTLE" ? "BOSS" : level.nodeType === "ELITE_BATTLE" ? "ELITE" : level.order <= 4 ? "NORMAL_EARLY" : "NORMAL_LATE";
    const cappedDropDamage = Math.min(dropped.length, getDropDamageCap(dropDamageType));
    const gravityHookDamage = hasRelic(runRelics, "RELIC_GRAVITY_HOOK") ? Math.min(12, dropped.length) : 0;
    [...cleared, ...dropped].forEach((bubble) => emitCoreEvent("board_bubble_cleared", {
      sourceId: getBallIdForKind(firedKind), targetId: bubble.id, shotTransactionId, effectValue: 1,
      result: dropped.some((item) => item.id === bubble.id) ? "PLAYER_DROP" : "CLEARED",
    }));
    if (webCleared > 0) emitCoreEvent("board_modifier_removed", {
      sourceId: getBallIdForKind(firedKind), targetId: "MOD_WEB", shotTransactionId, effectValue: webCleared, result: "REMOVED",
    });
    if (!colors.includes(firedKind as BubbleColor)) emitCoreEvent("ball_special_effect_resolved", {
      sourceId: getBallIdForKind(firedKind), targetId: enemyState.enemyId, shotTransactionId,
      effectValue: cleared.length + dropped.length, result: matched || firedKind === "curseWeb" ? "RESOLVED" : "NO_TRIGGER",
    });
    if (coreCleared) emitCoreEvent("boss_core_cleared", {
      sourceId: getBallIdForKind(firedKind), targetId: "BUBBLE_BOSS_CORE", shotTransactionId, effectValue: 3, result: "VULNERABLE_APPLIED",
    });
    const nextMisses = matched ? 0 : misses + 1;
    const enemyDamage = resolveEnemyShotDamage(enemyState, {
      components: [
        { sourceType: "MATCH_CLEAR", rawDamage: cleared.length },
        { sourceType: "BUBBLE_DROP", rawDamage: cappedDropDamage },
        { sourceType: "RELIC", rawDamage: gravityHookDamage },
        { sourceType: skillLoaded && firedKind === "fire" ? "SKILL" : "SPECIAL_BALL", rawDamage: specialDamage + weakpointCleared * 3 },
      ],
      vulnerabilityMultiplier: vulnerableShots > 0 ? 1.5 : undefined,
      specialDamageMultiplier: getSpecialEffectMultiplier(board.filter((bubble) => bubble.mirror).length),
      shotDamageMultiplier: hasRelic(runRelics, "RELIC_MIRROR_WALL") && trajectory.rebounds >= 2 ? 1.5 : 1,
    });
    let nextEnemyState = enemyDamage.state;
    let phaseChangedThisShot = enemyDamage.phaseChanged;
    let phaseTransitionFrom = enemyDamage.fromPhase;
    let phaseTransitionTo = enemyDamage.toPhase;
    if (mirrorCleared) nextEnemyState = { ...nextEnemyState, vulnerableShots: Math.max(1, nextEnemyState.vulnerableShots) };
    const damage = enemyDamage.actualDamage;
    let nextEnemyHp = nextEnemyState.hp;
    const nextShot = shotCount + 1;
    let nextPhase = nextEnemyState.phaseIndex + 1;
    let nextShotBudget = consumedShotBudget;
    let phaseShotGrant = 0;
    if (enemyDamage.phaseChanged) {
      working = spawnBossCore(working, level.id, enemyDamage.toPhase);
      const completedPhaseId = enemyState.phases[enemyDamage.fromPhase - 1]?.phaseId ?? `PHASE_${enemyDamage.fromPhase}`;
      const phaseGrant = grantBossPhaseShots(nextShotBudget, completedPhaseId, `${shotTransactionId}-phase-${enemyDamage.fromPhase}`);
      nextShotBudget = phaseGrant.state;
      phaseShotGrant = phaseGrant.result.granted;
      if (phaseShotGrant > 0) {
        emitShotBudgetEvent("shots_granted", consumedShotBudget, nextShotBudget, { grant_source: "BOSS_PHASE", grant_value: phaseShotGrant, shot_transaction_id: shotTransactionId });
        window.dispatchEvent(new CustomEvent("ON_EXTRA_SHOTS_GRANTED", { detail: { source: "BOSS_PHASE", grantedAmount: phaseShotGrant, state: nextShotBudget } }));
      }
    }
    let relicShieldBonus = 0;
    const tryRelicShotGrant = (relicId: string, condition: boolean, amount: number, shieldBonus = 0) => {
      const triggerKey = `${battleIdRef.current}:${relicId}`;
      if (!condition || !hasRelic(runRelics, relicId) || processedRelicTriggersRef.current.has(triggerKey)) return;
      const granted = grantShotBudget(nextShotBudget, {
        source: "RELIC",
        sourceId: relicId,
        amount,
        ignoreRuntimeCap: false,
        transactionId: `${shotTransactionId}-${relicId}`,
      });
      nextShotBudget = granted.state;
      processedRelicTriggersRef.current.add(triggerKey);
      relicShieldBonus += shieldBonus;
      emitCoreEvent("relic_triggered", {
        sourceId: relicId, targetId: "SHOT_BUDGET", shotTransactionId,
        effectValue: granted.result.granted, result: "TRIGGERED",
      });
    };
    tryRelicShotGrant("RELIC_PRECISION_RECYCLE", dropped.length >= 10, 1);
    tryRelicShotGrant("RELIC_LAST_MAGAZINE", shotBudget.remainingShots > 3 && consumedShotBudget.remainingShots <= 3, 2);
    tryRelicShotGrant("RELIC_SPIDER_SPOOL", webCleared >= 3, 1, 5);
    if (gravityHookDamage > 0) emitCoreEvent("relic_triggered", {
      sourceId: "RELIC_GRAVITY_HOOK", targetId: nextEnemyState.enemyId, shotTransactionId,
      effectValue: gravityHookDamage, result: "TRIGGERED",
    });
    recordTelemetryShot(battleTelemetryRef.current, { missed: !matched, damage: enemyDamage });
    window.dispatchEvent(new CustomEvent("ON_PLAYER_SHOT_CONFIRMED", { detail: { levelId: level.id, shot: nextShot, damage } }));
    let unassignedShieldDamage = enemyDamage.shieldDamage;
    const rawDamageBySource = {
      MATCH_CLEAR: cleared.length,
      BUBBLE_DROP: cappedDropDamage,
      SPECIAL_BALL: skillLoaded && firedKind === "fire" ? 0 : specialDamage + weakpointCleared * 3,
      RELIC: gravityHookDamage,
      SKILL: skillLoaded && firedKind === "fire" ? specialDamage + weakpointCleared * 3 : 0,
      STATUS: 0,
    };
    Object.entries(enemyDamage.damageBySource).forEach(([sourceType, value]) => {
      if (value <= 0) return;
      const sourceShieldDamage = Math.min(value, unassignedShieldDamage);
      unassignedShieldDamage -= sourceShieldDamage;
      window.dispatchEvent(new CustomEvent("ON_DAMAGE_DEALT_TO_ENEMY", { detail: {
        levelId: level.id,
        enemyId: enemyState.enemyId,
        sourceType,
        rawDamage: rawDamageBySource[sourceType as keyof typeof rawDamageBySource],
        shieldDamage: sourceShieldDamage,
        hpDamage: value - sourceShieldDamage,
        shotIndex: nextShot,
      } }));
    });
    if (enemyDamage.shieldBroken) window.dispatchEvent(new CustomEvent("ON_ENEMY_SHIELD_BROKEN", { detail: { levelId: level.id, phase: nextPhase } }));
    if (enemyDamage.phaseChanged) {
      window.dispatchEvent(new CustomEvent("ON_BOSS_PHASE_HP_ZERO", { detail: { levelId: level.id, phase: enemyDamage.fromPhase, overkillDamage: enemyDamage.overkillDamage } }));
      window.dispatchEvent(new CustomEvent("ON_BOSS_PHASE_CHANGED", { detail: { levelId: level.id, fromPhase: enemyDamage.fromPhase, toPhase: enemyDamage.toPhase, carryDamage: enemyDamage.carryDamage } }));
      window.dispatchEvent(new CustomEvent("ON_BOSS_PHASE_ENDED", { detail: { levelId: level.id, phase: enemyDamage.fromPhase } }));
      window.dispatchEvent(new CustomEvent("ON_BOSS_PHASE_STARTED", { detail: { levelId: level.id, phase: enemyDamage.toPhase } }));
      emitCoreEvent("boss_phase_changed", { sourceId: nextEnemyState.enemyId, targetId: `PHASE_${enemyDamage.toPhase}`, shotTransactionId, effectValue: enemyDamage.carryDamage, result: "CHANGED" });
    }
    let note = matched
      ? `消除 ${cleared.length} · 掉落 ${dropped.length} · 对${level.name}造成 ${damage} 伤害${enemyDamage.shieldDamage ? `（护盾 ${enemyDamage.shieldDamage}）` : ""}`
      : "没有形成消除，保底抽球权重已提升";
    if (enemyDamage.phaseChanged) note = `${note}｜阶段锁触发，溢出伤害仅继承 ${enemyDamage.carryDamage}`;
    if (phaseShotGrant > 0) note = `${note}｜阶段突破，发射次数 +${phaseShotGrant}`;
    if (mirrorCleared) note = `${note}｜镜像泡泡清除：敌人下一发易伤`;
    if (missWebAdded) note = `${note}｜蛛网风暴：空发新增 1 个蛛网（${nextBossMissWebTriggers}/2）`;

    let nextHealth = health;
    if (relicShieldBonus > 0) nextHealth = addShield(nextHealth, relicShieldBonus).state;
    let nextEnemyStatuses = enemyStatuses.map((status) => ({ ...status }));
    const redClearCount = cleared.filter((bubble) => bubble.color === "red").length;
    const passiveBurnValue = matched && redClearCount >= Number(firePassiveCondition?.value ?? 3) ? Number(firePassiveBurn?.value ?? 0) : 0;
    const specialMagnitude = (hasRelic(runRelics, "RELIC_COMPRESSION") && runBag.length <= 12 ? 1.3 : 1)
      * (hasRelic(runRelics, "RELIC_BLOOD_MAGAZINE") ? 1.3 : 1);
    const ballBurnValue = firedKind === "fire" && matched ? Math.ceil(Number(fireBallBurn?.value ?? 0) * specialMagnitude) : 0;
    const burnAdded = passiveBurnValue + ballBurnValue;
    if (burnAdded > 0 && !nextEnemyState.defeated) {
      nextEnemyStatuses = addOrRefreshStatus(nextEnemyStatuses, "STATUS_BURN_ENEMY", {
        value: burnAdded,
        enemyActions: Math.max(Number(firePassiveBurn?.durationEnemyActions ?? 0), Number(fireBallBurn?.durationEnemyActions ?? 0)),
      });
      const burn = nextEnemyStatuses.find((status) => status.statusId === "STATUS_BURN_ENEMY");
      note = `${note}｜燃烧 +${burnAdded}（当前 ${burn?.value ?? burnAdded}）`;
      window.dispatchEvent(new CustomEvent("status_added", { detail: {
        run_id: battleIdRef.current.split("-battle-")[0],
        battle_id: battleIdRef.current,
        level_id: level.id,
        source_id: firedKind === "fire" ? "BALL_FIRE" : "SKILL_FIRE_PASSIVE",
        target_id: nextEnemyState.enemyId,
        shot_transaction_id: shotTransactionId,
        effect_value: burnAdded,
        result: "APPLIED",
        status_id: "STATUS_BURN_ENEMY",
      } }));
    }
    if (hasRelic(runRelics, "RELIC_WEB_CUTTER") && webCleared > 0) {
      const shieldGain = Math.min(6, webCleared);
      nextHealth = addShield(nextHealth, shieldGain).state;
      emitCoreEvent("relic_triggered", { sourceId: "RELIC_WEB_CUTTER", targetId: "PLAYER", shotTransactionId, effectValue: shieldGain, result: "TRIGGERED" });
    }
    let relicGold = 0;
    const triggerLimitedRelic = (relicId: string, condition: boolean, maxPerBattle: number, effect: () => number) => {
      if (!condition || !hasRelic(runRelics, relicId)) return;
      const prefix = `${battleIdRef.current}:${relicId}:`;
      const triggerCount = [...processedRelicTriggersRef.current].filter((key) => key.startsWith(prefix)).length;
      const key = `${prefix}${nextShot}`;
      if (triggerCount >= maxPerBattle || processedRelicTriggersRef.current.has(key)) return;
      processedRelicTriggersRef.current.add(key);
      const value = effect();
      emitCoreEvent("relic_triggered", { sourceId: relicId, targetId: "PLAYER", shotTransactionId, effectValue: value, result: "TRIGGERED" });
    };
    triggerLimitedRelic("RELIC_GREED_COIN", directMatchClearCount === 3, 3, () => { relicGold += 2; return 2; });
    triggerLimitedRelic("RELIC_GREEN_LEAF_BADGE", cleared.filter((bubble) => bubble.color === "green").length >= 4, 4, () => {
      const healed = healPlayer(nextHealth, 1, "COMBAT"); nextHealth = healed.state; return healed.actual;
    });
    triggerLimitedRelic("RELIC_BLUE_BARRIER", cleared.filter((bubble) => bubble.color === "blue").length >= 4, 4, () => {
      const shielded = addShield(nextHealth, 3); nextHealth = shielded.state; return shielded.actual;
    });
    const nextBattleCoinBubbleCountsByPhase = [...battleCoinBubbleCountsByPhase];
    const coinPhaseIndex = enemyState.nodeType === "BOSS" ? enemyState.phaseIndex : 0;
    nextBattleCoinBubbleCountsByPhase[coinPhaseIndex] = (nextBattleCoinBubbleCountsByPhase[coinPhaseIndex] ?? 0) + coinCleared;
    const nextBattleRelicGold = battleRelicGold + relicGold;
    const nextBattleExtraGold = battleExtraGold + (chestCleared && nextShot <= 6 ? 12 : 0);
    const nextBattleBoardClearCount = battleBoardClearCount + (playerBoardClearedThisShot ? 1 : 0);
    let nextPressure = Math.max(0, resolveIcePressure(pressure + 1, firedKind === "ice" && matched) - (blueMatched && hasRelic(runRelics, "RELIC_ICE_CLOCK") ? 1 : 0) - chargeCleared);
    let nextIntentDelay = enemyIntentDelay;
    let nextIntentClock = enemyIntentClock;
    let nextPhaseIntentCount = phaseIntentCount;
    let nextEnemyIntentCount = enemyIntentCount;
    let nextEnemyAttackCount = enemyAttackCount;
    let nextReserveLockShots = Math.max(0, reserveLockShots - 1);
    let shotHpDamage = 0;
    let fatalSourceId = "";
    let resolvedPressureFeedback: PressureFeedback | null = null;
    const applyDamage = (event: DamageEvent) => {
      const resolved = resolvePlayerDamage(nextHealth, event, processedDamageIdsRef.current);
      processedDamageIdsRef.current = resolved.processedEventIds;
      nextHealth = resolved.state;
      shotHpDamage += resolved.result.hpDamage;
      if (resolved.result.causedDowned) fatalSourceId = event.sourceId;
      return resolved.result;
    };
    if (!colors.includes(firedKind as BubbleColor) && hasRelic(runRelics, "RELIC_BLOOD_MAGAZINE")) {
      const selfCost = applyDamage({
        eventId: `${shotTransactionId}-blood-magazine`, sourceId: "RELIC_BLOOD_MAGAZINE", sourceType: "RELIC",
        damageType: "SELF_COST", baseValue: 1, canBeBlockedByShield: false, canKillPlayer: false, tags: ["SPECIAL_BALL_COST"],
      });
      note = `${note}｜血色弹匣自损 ${selfCost.hpDamage}`;
    }
    const shotBudgetFailurePending = resolveShotBudgetOutcome(nextShotBudget, nextEnemyState.defeated) === "SHOT_LIMIT_EXHAUSTED";
    let nextPressureDepthRows = pressureDepthRows;
    let nextBoardOffsetY = getBoardOffsetY(working, nextPressureDepthRows);
    let boardRefilledThisShot = false;
    if (!working.length && !nextEnemyState.defeated && !shotBudgetFailurePending) {
      const refillKey = level.nodeType === "BOSS_BATTLE" ? "boss" : level.nodeType === "ELITE_BATTLE" ? "elite" : "normal";
      const refillRules = statusCoreConfig.boardClearRefill[refillKey] as { pressureCarryRate?: number } | undefined;
      working = makeSpawnedBoard(level, runBag);
      nextPressureDepthRows = 0;
      nextPressure = Math.floor(nextPressure * Number(refillRules?.pressureCarryRate ?? .5));
      nextBoardOffsetY = getBoardOffsetY(working, 0);
      boardRefilledThisShot = true;
      note = `${note}｜棋盘清空：立即补盘，压力折算为 ${nextPressure}`;
    }

    if (nextEnemyHp > 0 && !shotBudgetFailurePending) {
      if (phaseChangedThisShot) {
        nextBossMissWebTriggers = 0;
        nextPressure = pressure;
        nextIntentClock = 0;
        nextPhaseIntentCount = 0;
        nextIntentDelay = 1;
        note = `${note}｜阶段转换保护：本发不触发下压或敌人意图，下发为安全发射`;
      } else if (nextIntentDelay > 0) {
        nextIntentDelay -= 1;
        note = `${note}｜行动保护：敌人行动延迟 1 发`;
      } else {
        nextIntentClock += 1;
        const nextStateIntent = getIntentPreview(nextEnemyState, nextPhaseIntentCount, nextIntentClock);
        if (nextIntentClock >= getIntentInterval(nextEnemyState) && nextStateIntent.action) {
          const action = nextStateIntent.action;
          const burn = nextEnemyStatuses.find((status) => status.statusId === "STATUS_BURN_ENEMY" && (status.remainingEnemyActions ?? 0) > 0);
          if (burn) {
            const burnTickValue = burn.value
              + (hasRelic(runRelics, "RELIC_EMBER_BAG") ? 1 : 0)
              + (nextEnemyState.nodeType === "BOSS" && hasRelic(runRelics, "RELIC_LAVA_HEART") ? 2 : 0);
            const burnDamage = resolveEnemyShotDamage(nextEnemyState, {
              components: [{ sourceType: "STATUS", rawDamage: burnTickValue }],
            });
            nextEnemyState = burnDamage.state;
            nextEnemyHp = nextEnemyState.hp;
            nextEnemyStatuses = tickStatuses(nextEnemyStatuses, "ENEMY_ACTION");
            battleTelemetryRef.current.damageBySource.STATUS += burnDamage.actualDamage;
            battleTelemetryRef.current.totalDamage += burnDamage.actualDamage;
            battleTelemetryRef.current.highestSingleShotDamage = Math.max(battleTelemetryRef.current.highestSingleShotDamage, burnDamage.actualDamage);
            note = `${note}｜燃烧结算 ${burnDamage.actualDamage} 伤害`;
            window.dispatchEvent(new CustomEvent("status_tick", { detail: {
              run_id: battleIdRef.current.split("-battle-")[0], battle_id: battleIdRef.current, level_id: level.id,
              source_id: "STATUS_BURN_ENEMY", target_id: nextEnemyState.enemyId, shot_transaction_id: shotTransactionId,
              effect_value: burnDamage.actualDamage, result: "RESOLVED",
            } }));
            if (burnDamage.phaseChanged) {
              phaseChangedThisShot = true;
              phaseTransitionFrom = burnDamage.fromPhase;
              phaseTransitionTo = burnDamage.toPhase;
              nextPhase = burnDamage.toPhase;
              working = spawnBossCore(working, level.id, burnDamage.toPhase);
              const completedPhaseId = enemyState.phases[burnDamage.fromPhase - 1]?.phaseId ?? `PHASE_${burnDamage.fromPhase}`;
              const statusPhaseGrant = grantBossPhaseShots(nextShotBudget, completedPhaseId, `${shotTransactionId}-burn-phase-${burnDamage.fromPhase}`);
              nextShotBudget = statusPhaseGrant.state;
              phaseShotGrant += statusPhaseGrant.result.granted;
              nextPressure = pressure;
              nextIntentClock = 0;
              nextPhaseIntentCount = 0;
              nextIntentDelay = 1;
              note = `${note}｜燃烧击破阶段，发射次数 +${statusPhaseGrant.result.granted}`;
              emitCoreEvent("boss_phase_changed", { sourceId: "STATUS_BURN_ENEMY", targetId: `PHASE_${burnDamage.toPhase}`, shotTransactionId, effectValue: burnDamage.carryDamage, result: "CHANGED" });
            }
          }

          if (!nextEnemyState.defeated && !phaseChangedThisShot) {
            window.dispatchEvent(new CustomEvent("enemy_intent_resolved", { detail: {
              run_id: battleIdRef.current.split("-battle-")[0], battle_id: battleIdRef.current, level_id: level.id,
              source_id: action.actionId, target_id: "PLAYER", shot_transaction_id: shotTransactionId,
              effect_value: getConfiguredIntentDamage(action), result: "RESOLVED",
            } }));
            const enemyAction = applyConfiguredEnemyIntent(working, action, nextShot, nextBoardOffsetY);
            working = enemyAction.board;
            nextIntentClock = 0;
            nextPhaseIntentCount += 1;
            nextEnemyIntentCount += 1;
            nextBossMissWebTriggers = 0;
            battleTelemetryRef.current.enemyIntentCount += 1;
            nextReserveLockShots = Math.max(nextReserveLockShots, enemyAction.reserveLockShots);
            enemyAction.playerStatuses.forEach((pendingStatus) => {
              const purifyKey = `${battleIdRef.current}:RELIC_PURIFYING_FLASK`;
              if (pendingStatus.statusId === "STATUS_POISON_PLAYER" && hasRelic(runRelics, "RELIC_PURIFYING_FLASK") && !processedRelicTriggersRef.current.has(purifyKey)) {
                processedRelicTriggersRef.current.add(purifyKey);
                nextHealth = healPlayer(nextHealth, 5, "EVENT").state;
                emitCoreEvent("relic_triggered", { sourceId: "RELIC_PURIFYING_FLASK", targetId: pendingStatus.statusId, shotTransactionId, effectValue: 5, result: "CANCELLED_STATUS" });
                return;
              }
              const statuses = nextHealth.statuses.map((status) => ({ ...status }));
              const existing = statuses.find((status) => status.id === pendingStatus.statusId);
              if (existing) {
                existing.damagePerTrigger = Math.min(6, (existing.damagePerTrigger ?? 0) + pendingStatus.value);
                existing.remainingTriggers = Math.max(existing.remainingTriggers, pendingStatus.durationEnemyActions);
              } else statuses.push({ id: pendingStatus.statusId, stacks: 1, remainingTriggers: pendingStatus.durationEnemyActions, damagePerTrigger: pendingStatus.value });
              nextHealth = { ...nextHealth, statuses };
            });
            if (enemyAction.shieldRestore > 0) {
              const restoration = restoreEnemyShieldOnce(nextEnemyState, enemyAction.shieldRestore);
              nextEnemyState = restoration.state;
              note = `${note}｜${enemyAction.note}：恢复 ${restoration.restored} 护盾`;
            }
            if (enemyAction.damage > 0) {
              nextEnemyAttackCount += 1;
              battleTelemetryRef.current.enemyAttackCount += 1;
              const damageResult = applyDamage({
                eventId: `${battleIdRef.current}-enemy-${nextShot}`,
                sourceId: nextEnemyState.enemyId,
                sourceType: "ENEMY_INTENT",
                damageType: "ENEMY_ATTACK",
                baseValue: enemyAction.damage,
                canBeBlockedByShield: true,
                canKillPlayer: true,
                tags: [action.actionId, `PHASE_${nextPhase}`],
              });
              window.dispatchEvent(new CustomEvent("ON_ENEMY_ATTACKED_PLAYER", { detail: { levelId: level.id, enemyId: nextEnemyState.enemyId, actionId: action.actionId, rawDamage: enemyAction.damage, shieldDamage: damageResult.shieldDamage, hpDamage: damageResult.hpDamage, shotIndex: nextShot } }));
              note = `${note}｜${enemyAction.note}（护盾吸收 ${damageResult.shieldDamage}，生命 -${damageResult.hpDamage}）`;
            } else if (enemyAction.shieldRestore <= 0) note = `${note}｜${enemyAction.note}`;

            const tickingStatuses = nextHealth.statuses.filter((status) => status.remainingTriggers > 0 && (status.damagePerTrigger ?? 0) > 0);
            if (tickingStatuses.length) {
              let statusHpDamage = 0;
              tickingStatuses.forEach((status) => {
                const damageResult = applyDamage({
                  eventId: `${battleIdRef.current}-status-${status.id}-${nextEnemyIntentCount}`,
                  sourceId: status.id,
                  sourceType: "PLAYER_STATUS",
                  damageType: "STATUS_DAMAGE",
                  baseValue: Math.min(6, status.damagePerTrigger ?? 0),
                  canBeBlockedByShield: false,
                  canKillPlayer: true,
                  tags: ["DAMAGE_OVER_TIME"],
                });
                statusHpDamage += damageResult.hpDamage;
              });
              nextHealth = {
                ...nextHealth,
                statuses: nextHealth.statuses
                  .map((status) => ({ ...status, remainingTriggers: status.remainingTriggers - 1 }))
                  .filter((status) => status.remainingTriggers > 0),
              };
              note = `${note}｜中毒结算 ${statusHpDamage} 点（无视护盾）`;
            }
          }
        }
      }
    }

    if (!shotBudgetFailurePending && !phaseChangedThisShot && !boardRefilledThisShot && nextPressure >= pressureMax && nextEnemyHp > 0 && !nextHealth.isDowned) {
      battleTelemetryRef.current.pressureTriggerCount += 1;
      if (hasRelic(runRelics, "RELIC_PRESSURE_BARRIER")) {
        nextHealth = addShield(nextHealth, 5).state;
        emitCoreEvent("relic_triggered", { sourceId: "RELIC_PRESSURE_BARRIER", targetId: "PLAYER", shotTransactionId, effectValue: 5, result: "TRIGGERED" });
      }
      const pressureBoard = addPressureRow(working, nextShot, level, runBag, nextPhase, levelPressureConfig.boardDropRows);
      nextPressureDepthRows += pressureBoard.dropRows;
      const resolveId = `${battleIdRef.current}-pressure-${nextShot}`;
      const pressureResolution = resolvePressureOverflowBoard({
        battleId: battleIdRef.current,
        resolveId,
        boardAfterDrop: pressureBoard.board,
        collapseRow: getPressureCollapseRow(nextBoardOffsetY),
        overflowCountBeforeResolve: nextHealth.overflowCountThisBattle,
        damageCap: levelOverflowDamageCap,
        processedResolveIds: processedPressureResolveIdsRef.current,
        findDetached: removeFloating,
        config: levelPressureConfig,
      });
      processedPressureResolveIdsRef.current = pressureResolution.processedResolveIds;
      working = pressureResolution.board;
      nextPressure = 0;
      let completedPressureResult = pressureResolution.result;
      if (pressureResolution.impacted.length) {
        battleTelemetryRef.current.overflowCount += 1;
        let overflowDamage = pressureResolution.result.finalDamage;
        const unyieldingKey = `${battleIdRef.current}:RELIC_UNYIELDING_CROWN`;
        if (hasRelic(runRelics, "RELIC_UNYIELDING_CROWN") && !processedRelicTriggersRef.current.has(unyieldingKey)) {
          overflowDamage = Math.ceil(overflowDamage * .5);
          processedRelicTriggersRef.current.add(unyieldingKey);
          emitCoreEvent("relic_triggered", { sourceId: "RELIC_UNYIELDING_CROWN", targetId: "PRESSURE_OVERFLOW", shotTransactionId, effectValue: overflowDamage, result: "TRIGGERED" });
        }
        const damageResult = applyDamage({
          eventId: resolveId,
          sourceId: "PRESSURE_LINE",
          sourceType: "BOARD_OVERFLOW",
          damageType: "PRESSURE_OVERFLOW",
          baseValue: overflowDamage,
          canBeBlockedByShield: levelPressureConfig.damage.canBeBlockedByShield,
          canKillPlayer: true,
          tags: ["OVERFLOW", `COUNT_${pressureResolution.result.overflowCountAfterResolve}`],
          metadata: {
            impactedBubbleIds: pressureResolution.result.impactedBubbleIds,
            secondaryDetachedBubbleIds: pressureResolution.result.secondaryDetachedBubbleIds,
            overflowWeight: pressureResolution.result.overflowWeight,
            repeatMultiplier: pressureResolution.result.repeatMultiplier,
          },
        });
        completedPressureResult = completePressureOverflowResult(pressureResolution.result, damageResult);
        nextHealth = { ...nextHealth, overflowCountThisBattle: completedPressureResult.overflowCountAfterResolve };
        if (!nextHealth.isDowned && completedPressureResult.statusIds.length) {
          const statuses = nextHealth.statuses.map((status) => ({ ...status }));
          completedPressureResult.statusIds.forEach((statusId) => {
            const purifyKey = `${battleIdRef.current}:RELIC_PURIFYING_FLASK`;
            if (statusId === "STATUS_POISON_PLAYER" && hasRelic(runRelics, "RELIC_PURIFYING_FLASK") && !processedRelicTriggersRef.current.has(purifyKey)) {
              processedRelicTriggersRef.current.add(purifyKey);
              nextHealth = healPlayer(nextHealth, 5, "EVENT").state;
              emitCoreEvent("relic_triggered", { sourceId: "RELIC_PURIFYING_FLASK", targetId: statusId, shotTransactionId, effectValue: 5, result: "CANCELLED_STATUS" });
              return;
            }
            const existing = statuses.find((status) => status.id === statusId);
            if (existing) {
              existing.damagePerTrigger = Math.min(6, (existing.damagePerTrigger ?? 0) + 2);
              existing.remainingTriggers = Math.max(existing.remainingTriggers, 2);
            } else statuses.push({ id: statusId, stacks: 1, remainingTriggers: 2, damagePerTrigger: 2 });
          });
          nextHealth = { ...nextHealth, statuses };
        }
        const rewardLoss = completedPressureResult.lostCoinBubbleCount + completedPressureResult.lostChestBubbleCount;
        note = `${note}｜触底销毁 ${completedPressureResult.impactedBubbleIds.length} 球，压迫权重 ${completedPressureResult.overflowWeight}，合并伤害 ${completedPressureResult.finalDamage}（护盾 ${damageResult.shieldDamage} / 生命 ${damageResult.hpDamage}）`;
        if (completedPressureResult.secondaryDetachedBubbleIds.length) note = `${note}｜二次失联 ${completedPressureResult.secondaryDetachedBubbleIds.length} 球无收益坠落`;
        if (rewardLoss) note = `${note}｜奖励丢失 ${rewardLoss}`;
      } else {
        note = `${note}｜压力已满，盘面下降；本次没有泡泡越线`;
      }
      resolvedPressureFeedback = {
        result: completedPressureResult,
        impacted: pressureResolution.impacted,
        secondaryDetached: pressureResolution.secondaryDetached,
      };
      const telemetry = createPressureOverflowTelemetry(completedPressureResult, level.id);
      completedPressureResult.events.forEach((eventName) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail: completedPressureResult }));
      });
      window.dispatchEvent(new CustomEvent("pressure_overflow_resolved", { detail: telemetry }));
      console.debug("[pressure_overflow_resolved]", {
        ...telemetry,
        impacted: pressureResolution.impacted.map((bubble) => ({ id: bubble.id, row: bubble.row, col: bubble.col, type: getPressureBubbleKind(bubble), source: "PRESSURE_OVERFLOW" })),
        secondaryDetached: pressureResolution.secondaryDetached.map((bubble) => ({ id: bubble.id, row: bubble.row, col: bubble.col, type: getPressureBubbleKind(bubble), source: "OVERFLOW_SECONDARY_DETACH" })),
      });
      if (completedPressureResult.bubbleTypeCounts.OTHER > 0) {
        console.warn(`[pressure_overflow_resolved] ${completedPressureResult.bubbleTypeCounts.OTHER} 个未知类型泡泡已按 OTHER 权重强制销毁`);
      }
    }

    nextBoardOffsetY = getBoardOffsetY(working, nextPressureDepthRows);

    const bandageKey = `${battleIdRef.current}:RELIC_EMERGENCY_BANDAGE`;
    if (hasRelic(runRelics, "RELIC_EMERGENCY_BANDAGE")
      && !processedRelicTriggersRef.current.has(bandageKey)
      && health.currentHp / Math.max(1, health.maxHp) >= .3
      && nextHealth.currentHp / Math.max(1, nextHealth.maxHp) < .3) {
      processedRelicTriggersRef.current.add(bandageKey);
      nextHealth = healPlayer({ ...nextHealth, isDowned: false }, 12, "EVENT").state;
      emitCoreEvent("relic_triggered", { sourceId: "RELIC_EMERGENCY_BANDAGE", targetId: "PLAYER", shotTransactionId, effectValue: 12, result: "TRIGGERED" });
      note = `${note}｜紧急绷带回复 12 HP`;
    }

    if (nextHealth.isDowned && hasRelic(runRelics, "RELIC_LUCKY_BELL") && !nextHealth.deathPreventUsedThisBattle) {
      nextHealth = { ...nextHealth, currentHp: 1, isDowned: false, deathPreventUsedThisBattle: true };
      nextPressure = 0;
      note = `${note}｜幸运铃铛触发：保留 1 HP 并重置压力`;
    } else if (nextHealth.isDowned && hasRelic(runRelics, "RELIC_PHOENIX_FEATHER") && !nextHealth.deathPreventUsedThisBattle) {
      nextHealth = performDeathPrevent(nextHealth);
      setRunRelics((items) => items.filter((id) => normalizeRelicId(id) !== "RELIC_PHOENIX_FEATHER"));
      note = `${note}｜凤凰羽毛触发：恢复 ${nextHealth.currentHp} HP`;
    }

    let nextResult: BattleResult = "playing";
    let nextFailure: FailureState | null = null;
    if (nextEnemyState.defeated) {
      const recovery = applyBattleEndRecovery(nextHealth, level.order, level.nodeType);
      nextHealth = recovery.state;
      let lifeSeedHeal = 0;
      if (hasRelic(runRelics, "RELIC_LIFE_SEED")) {
        const lifeSeed = healPlayer(nextHealth, 3, "EVENT");
        nextHealth = lifeSeed.state;
        lifeSeedHeal = lifeSeed.actual;
      }
      nextResult = "win";
      note = `${note}｜战后恢复 ${recovery.actual + lifeSeedHeal} HP，护盾已清零`;
    } else if (nextHealth.isDowned) {
      nextFailure = createFailureState({
        reason: "PLAYER_HP_ZERO",
        sourceId: fatalSourceId,
        levelId: level.id,
        battleId: battleIdRef.current,
        health: nextHealth,
        detail: { shot: nextShot, phase: nextPhase },
      });
      nextResult = "downed";
    } else if (shotBudgetFailurePending) {
      nextFailure = createFailureState({
        reason: "SHOT_LIMIT_EXHAUSTED",
        sourceId: "SHOT_BUDGET",
        levelId: level.id,
        battleId: battleIdRef.current,
        health: nextHealth,
        detail: { shot: nextShot, phase: nextPhase, remainingShots: nextShotBudget.remainingShots },
      });
      nextResult = "downed";
      nextShotBudget = { ...nextShotBudget, exhausted: true, activeTransactionId: undefined };
      note = `${note}｜发射次数耗尽`;
      emitShotBudgetEvent("shot_budget_exhausted", consumedShotBudget, nextShotBudget, { failure_reason: "SHOT_LIMIT_EXHAUSTED", shot_transaction_id: shotTransactionId });
      window.dispatchEvent(new CustomEvent("ON_SHOT_BUDGET_EXHAUSTED", { detail: nextShotBudget }));
    }

    battleTelemetryRef.current.playerDamageTaken += shotHpDamage;
    const lastShotAt = battleTelemetryRef.current.shotConfirmedAtMs.at(-1) ?? battleTelemetryRef.current.controlGrantedAtMs;
    setCombatDebug({
      elapsedSec: Math.max(0, (lastShotAt - battleTelemetryRef.current.controlGrantedAtMs) / 1000),
      totalDamage: battleTelemetryRef.current.totalDamage,
      pressureTriggerCount: battleTelemetryRef.current.pressureTriggerCount,
      overflowCount: battleTelemetryRef.current.overflowCount,
      playerDamageTaken: battleTelemetryRef.current.playerDamageTaken,
    });
    if (nextResult === "win") {
      const goldBreakdown = calculateBattleGold({
        battleRewardId: `${battleIdRef.current}-gold-reward`,
        levelId: level.id,
        nodeType: level.nodeType,
        coinBubbleCount: nextBattleCoinBubbleCountsByPhase.reduce((sum, count) => sum + count, 0),
        bossCoinBubbleCountsByPhase: nextBattleCoinBubbleCountsByPhase,
        noPressureOverflow: nextHealth.overflowCountThisBattle === 0,
        noHpDamage: nextHealth.damageTakenThisBattle === 0,
        remainingShotRatio: nextShotBudget.remainingShots / Math.max(1, nextShotBudget.initialShots),
        playerBoardClearCount: nextBattleBoardClearCount,
        routeGoldMultiplier: activeRoute?.goldMultiplier ?? 1,
        relicGold: nextBattleRelicGold,
        extraEncounterBonus: nextBattleExtraGold,
      });
      const committedGold = commitBattleGold(goldState, goldBreakdown);
      setLastBattleGold(goldBreakdown);
      const goldTelemetry = {
        ...goldBreakdown,
        run_id: battleIdRef.current.split("-battle-")[0], chapter_id: "CHAPTER_1",
        level_id: level.id, battle_id: battleIdRef.current,
        base_gold: goldBreakdown.baseGold + goldBreakdown.fixedEncounterBonus + goldBreakdown.extraEncounterBonus,
        coin_bubble_gold: goldBreakdown.coinBubbleGold, performance_gold: goldBreakdown.performanceGold,
        route_multiplier: goldBreakdown.routeMultiplier, relic_gold: goldBreakdown.relicGold,
      };
      window.dispatchEvent(new CustomEvent("battle_gold_calculated", { detail: goldTelemetry }));
      if (committedGold.applied) {
        setGoldState(committedGold.state);
        window.dispatchEvent(new CustomEvent("battle_gold_committed", { detail: {
          ...goldTelemetry,
          gold_before: goldState.currentGold, gold_delta: goldBreakdown.totalGold,
          gold_after: committedGold.state.currentGold, balance_after: committedGold.state.currentGold,
        } }));
        emitGoldTransaction(goldBreakdown.battleRewardId, goldBreakdown.totalGold, "BATTLE_REWARD", undefined, committedGold.state.currentGold);
      }
      window.dispatchEvent(new CustomEvent("ON_ENEMY_DEFEATED", { detail: { levelId: level.id, enemyId: nextEnemyState.enemyId, shotIndex: nextShot } }));
      window.dispatchEvent(new CustomEvent("route_encounter_completed", { detail: {
        run_id: battleIdRef.current,
        chapter_id: "CHAPTER_1",
        completed_slot_index: level.order,
        selected_route_id: activeRoute?.routeId,
        selected_route_archetype: activeRoute?.primaryArchetype,
        battle_result: "WIN",
        player_hp_after: nextHealth.currentHp,
        combat_duration_sec: Math.max(0, ((battleTelemetryRef.current.shotConfirmedAtMs.at(-1) ?? battleTelemetryRef.current.controlGrantedAtMs) - battleTelemetryRef.current.controlGrantedAtMs) / 1000),
      } }));
      const snapshot = finishBattleTelemetry(battleTelemetryRef.current, {
        enemy: nextEnemyState,
        playerHp: nextHealth.currentHp,
        playerDamageTaken: battleTelemetryRef.current.playerDamageTaken,
        result: "WIN",
      });
      setLastCombatTelemetry(snapshot);
      window.dispatchEvent(new CustomEvent("ON_COMBAT_FINISHED", { detail: snapshot }));
      emitShotBudgetEvent("battle_end_shot_budget", consumedShotBudget, nextShotBudget, { battle_result: "WIN", failure_reason: "" });
      console.info("[combat_finished]", snapshot);
    }

    setBoard(working);
    setBoardOffsetY(nextBoardOffsetY);
    setPressureDepthRows(nextPressureDepthRows);
    setEnemyState(nextEnemyState);
    setHealth(nextHealth);
    setRunDamageTaken((value) => value + shotHpDamage);
    setMaxSingleDrop((value) => Math.max(value, dropped.length));
    setScore((value) => value + damage * 100 + dropped.length * 50);
    setShotCount(nextShot);
    setShotBudget({ ...nextShotBudget, activeTransactionId: undefined });
    setPressure(nextPressure);
    setEnemyIntentDelay(nextIntentDelay);
    setEnemyIntentClock(nextIntentClock);
    setPhaseIntentCount(nextPhaseIntentCount);
    setEnemyIntentCount(nextEnemyIntentCount);
    setEnemyAttackCount(nextEnemyAttackCount);
    setBossMissWebTriggers(nextBossMissWebTriggers);
    setReserveLockShots(nextReserveLockShots);
    setEnemyStatuses(nextEnemyStatuses);
    setBattleCoinBubbleCountsByPhase(nextBattleCoinBubbleCountsByPhase);
    setBattleRelicGold(nextBattleRelicGold);
    setBattleExtraGold(nextBattleExtraGold);
    setBattleBoardClearCount(nextBattleBoardClearCount);
    setMisses(nextMisses);
    setSkillCharge((value) => Math.min(fireActiveEnergyCost, value + cleared.length));
    setSkillLoaded(false);
    setVulnerableShots(coreCleared ? 3 : Math.max(0, vulnerableShots - 1));
    setBallBag(advanceBallBag(ballBag, working, nextMisses, level, nextPhase, nextPressure, nextShot));
    setSwapped(false);
    setMessage(coreCleared ? `${note}｜核心破坏：${level.name}进入易伤窗口！` : note);
    const holdForDropAnimation = dropped.length > 0
      && !phaseChangedThisShot
      && !(resolvedPressureFeedback && (resolvedPressureFeedback.impacted.length || resolvedPressureFeedback.secondaryDetached.length));
    if (dropFxTimerRef.current) window.clearTimeout(dropFxTimerRef.current);
    if (dropped.length) {
      setDropFeedback({ bubbles: dropped, boardOffsetY, sequence: nextShot });
      dropFxTimerRef.current = window.setTimeout(() => {
        setDropFeedback(null);
        if (holdForDropAnimation) setBusy(false);
        dropFxTimerRef.current = null;
      }, 840);
    } else {
      setDropFeedback(null);
      dropFxTimerRef.current = null;
    }
    if (phaseChangedThisShot) {
      setBossTransition({ from: phaseTransitionFrom, to: phaseTransitionTo });
      setPressureFeedback(null);
      if (bossTransitionTimerRef.current) window.clearTimeout(bossTransitionTimerRef.current);
      bossTransitionTimerRef.current = window.setTimeout(() => {
        setBossTransition(null);
        setBusy(false);
        bossTransitionTimerRef.current = null;
      }, spiderQueenBossConfig.transitionDurationMs);
    } else if (resolvedPressureFeedback && (resolvedPressureFeedback.impacted.length || resolvedPressureFeedback.secondaryDetached.length)) {
      setPressureFeedback(resolvedPressureFeedback);
      if (pressureFxTimerRef.current) window.clearTimeout(pressureFxTimerRef.current);
      pressureFxTimerRef.current = window.setTimeout(() => {
        setPressureFeedback(null);
        setBusy(false);
        pressureFxTimerRef.current = null;
      }, 720);
    } else if (!holdForDropAnimation) {
      setPressureFeedback(null);
      setBusy(false);
    } else {
      setPressureFeedback(null);
    }
    setProjectile(null);
    setFailureState(nextFailure);
    setResult(nextResult);
  };

  const fireAt = (target: Point) => {
    if (busy || result !== "playing" || helpOpen || settingsOpen || shotBudget.remainingShots <= 0) return;
    const trajectory = calculateTrajectory(board, target, boardOffsetY, currentShotKind === "pierce");
    const firedKind = currentShotKind;
    if (firedKind !== "bomb" && firedKind !== "curseWeb" && !findSnapCell(board, trajectory, boardOffsetY)) {
      setMessage("当前轨迹没有合法吸附点，请重新瞄准");
      return;
    }
    const transactionId = `${battleIdRef.current}-shot-${shotCount + 1}`;
    const consumed = consumeShotBudget(shotBudget, {
      transactionId,
      sourceBallUid: `${transactionId}-${firedKind}`,
      sourceBallId: firedKind,
      consumeAmount: 1,
      isChildProjectile: false,
      consumeShotBudget: true,
    });
    setShotBudget(consumed.state);
    emitShotBudgetEvent("shot_consumed", shotBudget, consumed.state, {
      shot_transaction_id: transactionId,
      ball_id: firedKind,
      ball_type: firedKind,
      consumed_amount: consumed.result.consumed,
    });
    window.dispatchEvent(new CustomEvent("ON_SHOT_CONSUMED", { detail: consumed.result }));
    emitCoreEvent("ball_fired", {
      sourceId: `BALL_${firedKind === "curseWeb" ? "CURSE_WEB" : firedKind.toUpperCase()}`,
      targetId: trajectory.hit?.id ?? "BOARD",
      shotTransactionId: transactionId,
      effectValue: consumed.result.consumed,
      result: "FIRED",
    });
    const warning = getShotWarningLevel(consumed.state);
    if (warning !== "NORMAL" && warning !== getShotWarningLevel(shotBudget) && consumed.state.remainingShots > 0) {
      emitShotBudgetEvent("low_shots_warning", shotBudget, consumed.state, { warning_level: warning, shot_transaction_id: transactionId });
      window.dispatchEvent(new CustomEvent("ON_LOW_SHOTS_WARNING", { detail: { warning, state: consumed.state } }));
    }
    if (consumed.state.remainingShots === 0) {
      window.dispatchEvent(new CustomEvent("ON_LAST_SHOT_STARTED", { detail: { transactionId, state: consumed.state } }));
    }
    setBusy(true);
    setMessage(consumed.state.remainingShots === 0 ? "最后一发！正在完整结算…" : firedKind === "rainbow" ? "彩虹棱镜触发：自动匹配命中区域" : `${ballNames[firedKind]}飞行中…`);
    let cursor = 0;
    let startedAt: number | null = null;

    const animate = (now: number) => {
      startedAt ??= now;
      cursor = Math.max(0, Math.min(trajectory.points.length - 1, Math.floor(Math.max(0, now - startedAt) / 8)));
      setProjectile({ point: trajectory.points[cursor] ?? trajectory.impact, kind: firedKind });
      if (cursor < trajectory.points.length - 1) {
        animationRef.current = window.requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        resolveShot(trajectory, firedKind, transactionId, consumed.state);
      }
    };
    animationRef.current = window.requestAnimationFrame(animate);
  };

  const localPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(BOARD_WIDTH, ((event.clientX - rect.left) / rect.width) * BOARD_WIDTH)),
      y: Math.max(40, Math.min(SHOOTER.y - 70, ((event.clientY - rect.top) / rect.height) * BOARD_HEIGHT)),
    };
  };

  const swapReserve = () => {
    if (busy || swapped || reserveLockShots > 0 || result !== "playing") return;
    setBallBag((state) => ({ ...state, current: state.reserve, reserve: state.current }));
    setSwapped(true);
    setMessage("已与备用球交换，本发不可再次交换");
  };

  const activateSkill = () => {
    if (busy || skillCharge < fireActiveEnergyCost || result !== "playing") return;
    setBallBag((state) => ({ ...state, current: fireActiveBallKind }));
    setSkillCharge(0);
    setSkillLoaded(true);
    setMessage(`主动技能「${fireBoy.activeSkill.name}」：当前球已变为${ballNames[fireActiveBallKind]}`);
  };

  const revivePlayer = () => {
    if (result !== "downed" || !failureState || !canManualRevive(health, failureState.reason)) return;
    const transactionId = `${battleIdRef.current}-manual-revive`;
    if (processedReviveIdsRef.current.has(transactionId)) return;
    processedReviveIdsRef.current.add(transactionId);
    const revived = performManualRevive(health);
    const dangerousIds = new Set(getDangerousBubbleIds(board));
    const survivingBoard = board.filter((bubble) => !dangerousIds.has(bubble.id));
    setBoard(survivingBoard);
    setBoardOffsetY(getBoardOffsetY(survivingBoard, pressureDepthRows));
    setHealth(revived);
    setPressure(0);
    setEnemyIntentDelay(survivalConfig.revive.delayEnemyIntentShots);
    setFailureState(null);
    setResult("playing");
    setMessage(`主动复活：恢复 ${revived.currentHp} HP、${revived.shield} 护盾，移除 ${dangerousIds.size} 个危险泡泡`);
  };

  const continueAfterShotLimit = () => {
    if (!shotLimitContinueAvailable) return;
    const transactionId = `${battleIdRef.current}-shot-limit-continue`;
    const continued = applyShotLimitContinue(shotBudget, transactionId);
    if (continued.result.granted <= 0) return;
    setShotBudget(continued.state);
    setHealth((state) => ({ ...state, reviveCountThisBattle: state.reviveCountThisBattle + 1 }));
    setPressure((value) => Math.min(2, value));
    if (!board.length) {
      const refill = makeSpawnedBoard(level, runBag);
      setBoard(refill);
      setPressureDepthRows(0);
      setBoardOffsetY(getBoardOffsetY(refill, 0));
    }
    setFailureState(null);
    setResult("playing");
    setBusy(false);
    setMessage(`弹尽继续：发射次数 +${continued.result.granted}`);
    emitShotBudgetEvent("shot_limit_continue_used", shotBudget, continued.state, {
      grant_source: "CONTINUE", grant_value: continued.result.granted, shot_transaction_id: transactionId,
    });
    window.dispatchEvent(new CustomEvent("ON_SHOT_LIMIT_CONTINUE_USED", { detail: continued.result }));
  };

  const finalizeFailedRun = () => {
    if (!failureState || goldState.runEnded) return;
    const snapshot = finishBattleTelemetry(battleTelemetryRef.current, {
      enemy: enemyState,
      playerHp: health.currentHp,
      playerDamageTaken: battleTelemetryRef.current.playerDamageTaken,
      result: "FAILED",
    });
    setLastCombatTelemetry(snapshot);
    window.dispatchEvent(new CustomEvent("ON_COMBAT_FINISHED", { detail: snapshot }));
    emitShotBudgetEvent("battle_end_shot_budget", shotBudget, shotBudget, { battle_result: "FAILED", failure_reason: failureState.reason });
    const conversion = convertRunGold(goldState, "FAILED", `${battleIdRef.current}-run-failed`);
    const metaCurrencyBalance = metaCurrency + conversion.convertedMetaCurrency;
    setMetaCurrency(metaCurrencyBalance);
    setRunSettlement({
      reachedLevel: level.order,
      failureReason: failureState.reason,
      totalDamageTaken: runDamageTaken,
      maxSingleDrop,
      relicCount: runRelics.length,
      bagChanges,
      metaCurrency: conversion.convertedMetaCurrency,
      metaCurrencyBalance,
    });
    setGoldState(conversion.state);
    if (conversion.applied) window.dispatchEvent(new CustomEvent("run_gold_converted", { detail: {
      run_id: battleIdRef.current.split("-battle-")[0], chapter_id: "CHAPTER_1", level_id: level.id,
      result: "FAILED", run_result: "FAILED", run_gold_before: gold,
      meta_currency_granted: conversion.convertedMetaCurrency, run_gold_after: conversion.state.currentGold,
    } }));
    setRunBag([]);
    setRunRelics([]);
    setResult("failed");
  };

  const continueWithReward = () => {
    if (!selectedReward) return;
    const reward = rewardCards.find((option) => option.id === selectedReward);
    if (!reward) return;
    let nextBag = [...runBag];
    let nextHealth = health;
    const nextRelics = [...runRelics];
    let nextGoldState = goldState;
    let changedBag = false;

    const addBall = (ball: BallKind, count = 1) => {
      nextBag = [...nextBag, ...Array.from({ length: count }, () => ball)];
      changedBag = true;
    };
    switch (reward.effect as RewardEffect) {
      case "ADD_RED": addBall("red"); break;
      case "ADD_BLUE": addBall("blue"); break;
      case "ADD_BOMB": addBall("bomb"); break;
      case "ADD_FIRE": addBall("fire"); break;
      case "ADD_ICE": addBall("ice"); break;
      case "ADD_RAINBOW": addBall("rainbow"); break;
      case "ADD_PIERCE": addBall("pierce"); break;
      case "REMOVE_NORMAL": {
        const normal = colors
          .map((color) => ({ color, count: nextBag.filter((ball) => ball === color).length }))
          .filter((item) => item.count > 1)
          .sort((a, b) => b.count - a.count)[0];
        if (normal && nextBag.length > 10) {
          nextBag.splice(nextBag.lastIndexOf(normal.color), 1);
          changedBag = true;
        }
        break;
      }
      case "HEAL_4": nextHealth = healPlayer(nextHealth, 4, "EVENT").state; break;
      case "HEAL_6": nextHealth = healPlayer(nextHealth, 6, "EVENT").state; break;
      case "HEAL_8": nextHealth = healPlayer(nextHealth, 8, "EVENT").state; break;
      case "GOLD_12": {
        const transactionId = `${battleIdRef.current}-reward-${reward.id}`;
        const transaction = applyGoldTransaction(nextGoldState, { transactionId, amount: 12, source: "EVENT" });
        if (transaction.applied) {
          nextGoldState = transaction.state;
          emitGoldTransaction(transactionId, 12, "EVENT", undefined, nextGoldState.currentGold);
        }
        break;
      }
      case "GOLD_20": {
        const transactionId = `${battleIdRef.current}-reward-${reward.id}`;
        const transaction = applyGoldTransaction(nextGoldState, { transactionId, amount: 20, source: "EVENT" });
        if (transaction.applied) {
          nextGoldState = transaction.state;
          emitGoldTransaction(transactionId, 20, "EVENT", undefined, nextGoldState.currentGold);
        }
        break;
      }
      case "WEB_CUTTER": if (!hasRelic(nextRelics, "RELIC_WEB_CUTTER")) nextRelics.push("RELIC_WEB_CUTTER"); break;
      case "PREVIEW_LENS": if (!hasRelic(nextRelics, "RELIC_MIRROR_SHARD")) nextRelics.push("RELIC_MIRROR_SHARD"); break;
      case "PHOENIX_FEATHER": if (!hasRelic(nextRelics, "RELIC_PHOENIX_FEATHER")) nextRelics.push("RELIC_PHOENIX_FEATHER"); break;
      case "MAX_HP_8": nextHealth = increaseMaxHp(nextHealth, 8, true).state; break;
      case "ADD_RELIC": {
        if (!reward.relicId) break;
        const acquired = acquireRelic(nextRelics.map(normalizeRelicId), reward.relicId);
        nextRelics.splice(0, nextRelics.length, ...acquired.relicIds);
        break;
      }
      case "BOSS_RELIC":
        if (!hasRelic(nextRelics, "RELIC_SPIDER_SPOOL")) nextRelics.push("RELIC_SPIDER_SPOOL");
        nextHealth = healPlayer(nextHealth, Math.ceil(nextHealth.maxHp * .30), "EVENT").state;
        break;
    }

    setRunBag(nextBag);
    setRunRelics(nextRelics);
    setHealth(nextHealth);
    setGoldState(nextGoldState);
    if (changedBag) setBagChanges((value) => value + 1);
    if (levelIndex === levels.length - 1) {
      const conversion = convertRunGold(nextGoldState, "VICTORY", `${battleIdRef.current}-run-victory`);
      const metaCurrencyBalance = metaCurrency + conversion.convertedMetaCurrency;
      setMetaCurrency(metaCurrencyBalance);
      setGoldState(conversion.state);
      setRunSettlement({
        reachedLevel: level.order,
        failureReason: "RUN_VICTORY",
        totalDamageTaken: runDamageTaken,
        maxSingleDrop,
        relicCount: nextRelics.length,
        bagChanges: bagChanges + (changedBag ? 1 : 0),
        metaCurrency: conversion.convertedMetaCurrency,
        metaCurrencyBalance,
      });
      if (conversion.applied) window.dispatchEvent(new CustomEvent("run_gold_converted", { detail: {
        run_id: battleIdRef.current.split("-battle-")[0], chapter_id: "CHAPTER_1", level_id: level.id,
        result: "VICTORY", run_result: "VICTORY", run_gold_before: nextGoldState.currentGold,
        meta_currency_granted: conversion.convertedMetaCurrency, run_gold_after: conversion.state.currentGold,
      } }));
      setChapterComplete(true);
      setSelectedReward(null);
      return;
    }
    openRouteSelection(levelIndex + 1, nextBag, nextHealth, nextRelics, nextGoldState.currentGold);
  };

  const pathPoints = preview.points.filter((_, index) => index % 3 === 0 || index === preview.points.length - 1).map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <main className="game-page">
      <div className="ambient-glow" />
      <section className="game-shell" aria-label="泡泡射手 Roguelite 试玩 Demo">
        <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label="打开设置">⚙</button>

        <nav className="chapter-route" aria-label="第一章关卡路线">
          <div><small>CHAPTER 01</small><strong>冰晶花园 · {progressSlotIndex}/10</strong><em>第 5 关精英 · 第 10 关 Boss</em></div>
          <div className="route-nodes">
            {chapterProgress.map((slot) => (
              <span
                key={slot.slotIndex}
                className={`route-progress-node is-${slot.state.toLowerCase()} ${slot.nodeType === "ELITE" ? "is-elite" : ""} ${slot.nodeType === "BOSS" ? "is-boss" : ""}`}
                aria-label={`第 ${slot.slotIndex} 关${slot.nodeType === "ELITE" ? "，精英" : slot.nodeType === "BOSS" ? "，Boss" : ""}`}
              >
                <b>{slot.slotIndex}</b><small>{slot.nodeType === "ELITE" ? "精" : slot.nodeType === "BOSS" ? "王" : "·"}</small>
              </span>
            ))}
          </div>
        </nav>

        <section className="boss-card" style={{ "--enemy": level.accent } as CSSProperties}>
          <span className={`boss-ribbon ribbon-${level.nodeType.toLowerCase()}`}>{level.typeLabel} · 第 {level.order} 关</span>
          <div className={`player-stat health-stat danger-${survivalUi.dangerLevel.toLowerCase()}`}>
            <span>♥</span><small>生命</small><strong>{survivalUi.currentHp}/{survivalUi.maxHp}</strong>
            <i className="player-hp-mini"><b style={{ width: `${survivalUi.hpPercent * 100}%` }} /></i>
          </div>
          <div className="player-stat shield-stat"><span>♦</span><small>护盾</small><strong>{survivalUi.shield}/{survivalUi.shieldMax}</strong></div>
          <div className="boss-portrait enemy-symbol"><span>{level.glyph}</span><i /><i /><i /></div>
          <div className="boss-name"><small>{level.nodeType === "BOSS_BATTLE" ? `阶段 ${phase} · ` : ""}{Math.max(vulnerableShots, enemyState.vulnerableShots) > 0 ? `易伤 ${Math.max(vulnerableShots, enemyState.vulnerableShots)} 发` : level.mechanic}</small><strong>{activeRoute?.nodeType === "ELITE" ? activeRoute.name : level.name}</strong>{(burnStatus || poisonStatus) && <em>{burnStatus ? `🔥 燃烧 ${burnStatus.value}/${burnStatus.remainingEnemyActions ?? 0}` : ""}{burnStatus && poisonStatus ? " · " : ""}{poisonStatus ? `☠ 中毒 ${poisonStatus.damagePerTrigger ?? 0}/${poisonStatus.remainingTriggers}` : ""}</em>}</div>
          <div className="intent-card"><span>✦</span><small>意图</small><strong>{getConfiguredIntentName(intentPreview.action)}</strong><em>{survivalUi.enemyIntentShotsRemaining} 发后 · {nextEnemyDamage > 0 ? `攻击 ${nextEnemyDamage}` : "盘面行动"}</em></div>
          <div className="hp-track">
            <i style={{ width: `${(enemyHp / enemyState.maxHp) * 100}%` }} />
            {enemyState.nodeType === "BOSS" && <><b className="phase-marker marker-one" /><b className="phase-marker marker-two" /></>}
            <strong>{enemyHp} / {enemyState.maxHp}</strong>
          </div>
          {enemyState.maxShield > 0 && (
            <div className="enemy-shield-track"><i style={{ width: `${(enemyState.shield / enemyState.maxShield) * 100}%` }} /><strong>敌方护盾 {enemyState.shield} / {enemyState.maxShield}</strong></div>
          )}
          <div className="battle-stats">
            <div><small>剩余发射</small><strong>{shotBudget.remainingShots}</strong></div>
            <div><small>分数</small><strong>{score.toLocaleString("zh-CN")}</strong></div>
            <div><small>压力</small><strong>{pressure} / {pressureMax}</strong><span className="pressure-dots">{Array.from({ length: pressureMax }, (_, i) => <i key={i} className={i < pressure ? "active" : ""} />)}</span></div>
          </div>
        </section>

        <section className="board-card">
          <div className="objective-strip">
            <span><i>{level.nodeType === "BOSS_BATTLE" ? "♛" : "◎"}</i> 目标 <strong>{level.objective.replace("击败敌人", "击败")}</strong></span>
            <span><i>⌁</i> 机制球 <strong>{mechanismCount}</strong></span>
            <span><i>{coreAlive ? "★" : "✓"}</i> 核心 <strong>{coreAlive ? 1 : 0}</strong></span>
            <em title={activeRoute ? `${activeRoute.uiSummary.riskText}；${activeRoute.uiSummary.rewardText}` : undefined}>{activeRoute?.name ?? "待选路线"} · 金币 {gold} · 球包 {runBag.length}{goldFeedback && <b key={goldFeedback.sequence} className={`gold-delta ${goldFeedback.delta > 0 ? "is-gain" : "is-spend"}`}>{goldFeedback.delta > 0 ? "+" : ""}{goldFeedback.delta}</b>}</em>
          </div>
          <div className="board-frame">
            <svg
              ref={svgRef}
              className={`bubble-board ${busy ? "is-busy" : ""} ${pressureFeedback ? "pressure-resolving" : ""}`}
              viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
              role="application"
              aria-label="拖动或点击棋盘瞄准并发射"
              onPointerMove={(event) => !busy && setAim(localPoint(event))}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setAim(localPoint(event));
              }}
              onPointerUp={(event) => {
                const point = localPoint(event);
                setAim(point);
                fireAt(point);
              }}
            >
              <defs>
                <radialGradient id="fill-red" cx="30%" cy="20%"><stop offset="0" stopColor="#fff" /><stop offset=".18" stopColor="#ff9c83" /><stop offset=".5" stopColor="#ff4f38" /><stop offset="1" stopColor="#b7132b" /></radialGradient>
                <radialGradient id="fill-blue" cx="30%" cy="20%"><stop offset="0" stopColor="#fff" /><stop offset=".18" stopColor="#80e7ff" /><stop offset=".52" stopColor="#168dff" /><stop offset="1" stopColor="#1545aa" /></radialGradient>
                <radialGradient id="fill-yellow" cx="30%" cy="20%"><stop offset="0" stopColor="#fff" /><stop offset=".18" stopColor="#fff59b" /><stop offset=".5" stopColor="#ffbc22" /><stop offset="1" stopColor="#d8680b" /></radialGradient>
                <radialGradient id="fill-green" cx="30%" cy="20%"><stop offset="0" stopColor="#fff" /><stop offset=".18" stopColor="#d4ff9a" /><stop offset=".52" stopColor="#72bd42" /><stop offset="1" stopColor="#23713f" /></radialGradient>
                <radialGradient id="fill-stone" cx="30%" cy="20%"><stop offset="0" stopColor="#e7eff8" /><stop offset=".25" stopColor="#9aa7b8" /><stop offset=".62" stopColor="#667389" /><stop offset="1" stopColor="#26364f" /></radialGradient>
                <radialGradient id="fill-egg" cx="30%" cy="20%"><stop offset="0" stopColor="#fff" /><stop offset=".2" stopColor="#e4bcff" /><stop offset=".55" stopColor="#9d62df" /><stop offset="1" stopColor="#432477" /></radialGradient>
                <radialGradient id="projectile-red"><stop offset="0" stopColor="#fff" /><stop offset=".2" stopColor="#ff8b72" /><stop offset="1" stopColor="#dd1830" /></radialGradient>
              </defs>
              <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="20" fill="transparent" />
              <line x1="18" x2={BOARD_WIDTH - 18} y1={DANGER_LINE_Y} y2={DANGER_LINE_Y} className="danger-line" />
              <text x={BOARD_WIDTH / 2} y={DANGER_LINE_Y - 10} textAnchor="middle" className="danger-text">↓ 压力警戒线 ↓</text>
              <g className="board-grid-layer" style={{ transform: `translateY(${boardOffsetY}px)` }}>
                {board.map((bubble) => <BoardBubbleView key={bubble.id} bubble={bubble} />)}
              </g>
              {dropFeedback && (
                <g transform={`translate(0 ${dropFeedback.boardOffsetY})`}>
                  {dropFeedback.bubbles.map((bubble, index) => (
                    <g
                      className="unlink-drop-ghost"
                      key={`drop-${dropFeedback.sequence}-${bubble.id}`}
                      style={{
                        "--drop-x": `${((index % 3) - 1) * 44}px`,
                        "--drop-delay": `${Math.min(index, 4) * 24}ms`,
                      } as CSSProperties}
                    >
                      <BoardBubbleView bubble={bubble} />
                    </g>
                  ))}
                </g>
              )}
              <g className="pressure-ghost-layer" style={{ transform: `translateY(${boardOffsetY}px)` }}>
                {pressureFeedback?.impacted.map((bubble) => (
                  <g className="pressure-impacted-ghost" key={`impacted-${bubble.id}`}><BoardBubbleView bubble={bubble} /></g>
                ))}
                {pressureFeedback?.secondaryDetached.map((bubble) => (
                  <g className="pressure-detached-ghost" key={`detached-${bubble.id}`}><BoardBubbleView bubble={bubble} /></g>
                ))}
              </g>
              {pressureFeedback && (pressureFeedback.result.hpDamage > 0 || pressureFeedback.result.shieldDamage > 0) && (
                <text x={BOARD_WIDTH / 2} y={DANGER_LINE_Y + 41} textAnchor="middle" className="pressure-damage-number">
                  {pressureFeedback.result.hpDamage > 0 ? `生命 -${pressureFeedback.result.hpDamage}` : `护盾 -${pressureFeedback.result.shieldDamage}`}
                </text>
              )}
              {!busy && result === "playing" && <polyline points={pathPoints} className="aim-path" />}
              {!busy && result === "playing" && <circle cx={preview.impact.x} cy={preview.impact.y} r="8" className="aim-target" />}
              {!projectile && result === "playing" && <ShooterBall kind={currentShotKind} />}
              {projectile && (
                <g className={`svg-projectile projectile-${projectile.kind}`}>
                  <circle cx={projectile.point.x} cy={projectile.point.y} r={BUBBLE_RADIUS - 1} />
                  <circle cx={projectile.point.x - 8} cy={projectile.point.y - 9} r="7" fill="rgba(255,255,255,.75)" />
                  {!colors.includes(projectile.kind as BubbleColor) && <text x={projectile.point.x} y={projectile.point.y + 8} textAnchor="middle">{projectile.kind === "bomb" ? "✦" : projectile.kind === "fire" ? "火" : projectile.kind === "ice" ? "冰" : projectile.kind === "rainbow" ? "★" : projectile.kind === "pierce" ? "➶" : "网"}</text>}
                </g>
              )}
            </svg>
            {pressureFeedback && (
              <div className="pressure-resolution-banner" role="status">
                <strong>触底销毁 {pressureFeedback.result.impactedBubbleIds.length}</strong>
                <span>二次失联 {pressureFeedback.result.secondaryDetachedBubbleIds.length}</span>
                {(pressureFeedback.result.lostCoinBubbleCount + pressureFeedback.result.lostChestBubbleCount) > 0 && <em>奖励丢失 {pressureFeedback.result.lostCoinBubbleCount + pressureFeedback.result.lostChestBubbleCount}</em>}
              </div>
            )}
            {bossTransition && (
              <div className="boss-phase-transition" role="status">
                <small>PHASE SHIFT</small><strong>阶段 {bossTransition.from} → {bossTransition.to}</strong><span>首发安全 · 敌人意图重置</span>
              </div>
            )}
          </div>
        </section>

        <div className="battle-message" role="status"><span>✦</span>{message}</div>

        <section className={`survival-hud survival-${survivalUi.dangerLevel.toLowerCase()}`} aria-label="玩家生存状态">
          <div className="survival-health">
            <span>♥</span>
            <div><small>玩家生命</small><strong>{survivalUi.currentHp} / {survivalUi.maxHp}</strong><em>{dangerLabels[survivalUi.dangerLevel]}</em></div>
            <i className="survival-health-bar" role="progressbar" aria-valuemin={0} aria-valuemax={survivalUi.maxHp} aria-valuenow={survivalUi.currentHp}>
              <b style={{ width: `${survivalUi.hpPercent * 100}%` }} />
            </i>
          </div>
          <div className="survival-metric metric-shield"><small>护盾</small><strong>♦ {survivalUi.shield}</strong><em>上限 {survivalUi.shieldMax}</em></div>
          <div className="survival-metric metric-intent"><small>下一次攻击</small><strong>{survivalUi.nextEnemyDamage ?? 0}</strong><em>{survivalUi.enemyIntentShotsRemaining ?? 0} 发后</em></div>
          <div className={`survival-metric metric-overflow ${survivalUi.overflowWarning ? "is-warning" : ""}`}><small>越线伤害</small><strong>{survivalUi.predictedOverflowDamage ?? 0}</strong><em>{survivalUi.overflowWarning ? "再下降触发" : "当前安全"}</em></div>
          <div className={`survival-metric metric-revive ${survivalUi.reviveAvailable ? "is-ready" : "is-used"}`}><small>主动复活</small><strong>{survivalUi.reviveAvailable ? "可用" : "已用"}</strong><em>本局 {health.reviveCountThisRun}/{survivalConfig.revive.maxManualRevivesPerRun}</em></div>
        </section>

        {survivalUi.overflowWarning && (
          <div className="overflow-warning" role="alert"><span>⚠</span><strong>压迫线预警</strong><em>再下降将受到：{survivalUi.predictedOverflowDamage} 点伤害</em></div>
        )}

        <section className="control-deck">
          <button className="skill-button" onClick={activateSkill} disabled={skillCharge < fireActiveEnergyCost || busy}>
            <span>火</span><div><small>主动技能</small><strong>{fireBoy.activeSkill.name}</strong><em>{skillCharge}/{fireActiveEnergyCost}</em></div>
          </button>
          <div className="launcher">
            <div className={`step-medallion shots-${shotWarningLevel.toLowerCase()}`}><small>发射次数</small><strong>{shotBudget.remainingShots}</strong><span>{shotWarningLevel === "LAST" ? "最后一发" : `初始 ${shotBudget.initialShots}`}</span></div>
          </div>
          <div className="next-slot"><small>下颗球</small><BallOrb kind={ballBag.next} /><strong>{ballNames[ballBag.next]}</strong></div>
          <button className={`reserve-slot ${swapped || reserveLockShots > 0 ? "is-used" : ""}`} onClick={swapReserve} disabled={swapped || reserveLockShots > 0 || busy}>
            <small>备用球</small><BallOrb kind={ballBag.reserve} small /><strong>{reserveLockShots > 0 ? `封锁 ${reserveLockShots} 发` : swapped ? "本发已换" : "点击交换"}</strong>
          </button>
        </section>

        {import.meta.env.DEV && (
          <details className="combat-debug-panel" open>
            <summary>战斗节奏调试（仅开发环境）</summary>
            <label>血量配置
              <select value={hpProfile} onChange={(event) => startLevel(levelIndex, { bag: runBag, health, relics: runRelics, profile: event.target.value as HpProfileVersion, route: activeRoute, routeSeed: activeRouteSeed })}>
                <option value="v1">v1 优化</option><option value="legacy">legacy 旧版</option>
              </select>
            </label>
            <div><span>旧版 → 当前最大 HP</span><strong>{enemyConfig.legacyHp} → {enemyState.maxHp}</strong></div>
            <div><span>敌人 HP</span><strong>{enemyState.hp}/{enemyState.maxHp}</strong></div>
            <div><span>敌人护盾</span><strong>{enemyState.shield}/{enemyState.maxShield}</strong></div>
            <div><span>阶段</span><strong>{phase}</strong></div>
            <div><span>战斗时长</span><strong>{combatDebug.elapsedSec.toFixed(1)}s</strong></div>
            <div><span>已发射 / 目标</span><strong>{shotCount} / {enemyConfig.targetShotsMin}–{enemyConfig.targetShotsMax}</strong></div>
            <div><span>剩余 / 初始次数</span><strong>{shotBudget.remainingShots} / {shotBudget.initialShots}</strong></div>
            <div><span>额外次数</span><strong>普通 {shotBudget.runtimeGrantedShots} · 阶段 {shotBudget.phaseGrantedShots}</strong></div>
            <div><span>有效伤害/发</span><strong>{effectiveDamagePerShot.toFixed(2)}</strong></div>
            <div><span>预计剩余发数</span><strong>{estimatedRemainingShots}</strong></div>
            <div><span>意图 / 攻击</span><strong>{enemyIntentCount} / {enemyAttackCount}</strong></div>
            <div><span>压力 / 越线</span><strong>{combatDebug.pressureTriggerCount} / {combatDebug.overflowCount}</strong></div>
            <div><span>玩家承伤</span><strong>{combatDebug.playerDamageTaken}</strong></div>
            {lastCombatTelemetry && <output>最近结算：{lastCombatTelemetry.shots_fired} 发 · {lastCombatTelemetry.combat_duration_sec.toFixed(1)} 秒</output>}
          </details>
        )}

        <div className="relic-bar" aria-label="当前遗物">
          {runRelics.map((id) => {
            const label = relicLabels[normalizeRelicId(id)];
            return label ? <span key={id}><i>{label.icon}</i><strong>{label.name}</strong><small>{label.desc}</small></span> : null;
          })}
        </div>

        {helpOpen && (
          <div className="modal-backdrop tutorial-modal" role="dialog" aria-modal="true" aria-label="试玩说明">
            <div className="tutorial-card">
              <span className="modal-gem">✦</span>
              <small>PLAYABLE DEMO</small>
              <h1>第一章 · 十关试炼</h1>
              <p>从林地史莱姆一路推进到蛛后。每场胜利后先选择奖励，再从稳健、构筑资源和高风险路线中三选一；顶部十格进度轨仅显示章节进度，不再直接选关。</p>
              <div className="tutorial-points">
                <span><i>01</i><strong>1–3 基础与支撑</strong><small>低密度、掉落路径、石头解障</small></span>
                <span><i>02</i><strong>4–9 构筑检验</strong><small>污染、蛛网、冰冻、反弹、幻影与核心</small></span>
                <span><i>03</i><strong>第 10 关 Boss</strong><small>织网、产卵与蛛网风暴三阶段</small></span>
              </div>
              <button onClick={() => setHelpOpen(false)}>开始战斗 <span>→</span></button>
            </div>
          </div>
        )}

        {settingsOpen && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="设置">
            <div className="settings-card">
              <button className="modal-close" onClick={() => setSettingsOpen(false)}>×</button>
              <small>SETTINGS</small><h2>战斗设置</h2>
              <label><span>音效</span><input type="checkbox" defaultChecked /></label>
              <label><span>瞄准辅助线</span><input type="checkbox" defaultChecked /></label>
              <button className="secondary-action" onClick={() => { setSettingsOpen(false); setHelpOpen(true); }}>查看玩法说明</button>
              <button className="secondary-action" onClick={() => startLevel(levelIndex, { bag: runBag, health, relics: runRelics, route: activeRoute, routeSeed: activeRouteSeed })}>重新开始本关</button>
              <button className="danger-action" onClick={resetRun}>重置第一章进度</button>
            </div>
          </div>
        )}

        {routeSelectionOpen && (
          <div className="modal-backdrop route-choice-backdrop" role="dialog" aria-modal="true" aria-label="选择下一条路线">
            <div className="route-choice-card">
              <header>
                <div><small>CARD ROUTE FLOW</small><h2>选择下一条路线</h2><p>第 {routeTargetIndex + 1} / 10 关 · {getSlotNodeType(routeTargetIndex + 1) === "ELITE" ? "精英里程碑" : getSlotNodeType(routeTargetIndex + 1) === "BOSS" ? "固定 Boss · 蛛后" : "普通战斗槽"}</p></div>
                <div className="route-run-stats"><span>♥ {health.currentHp}/{health.maxHp}</span><span>◆ {gold}</span><span>球包 {runBag.length}</span></div>
              </header>
              <div className="route-modal-progress" aria-label={`章节进度 ${routeTargetIndex + 1}/10`}>
                {chapterProgress.map((slot) => <i key={slot.slotIndex} className={`is-${slot.state.toLowerCase()} ${slot.nodeType === "ELITE" ? "is-elite" : ""} ${slot.nodeType === "BOSS" ? "is-boss" : ""}`}><b>{slot.slotIndex}</b><em>{slot.nodeType === "ELITE" ? "精" : slot.nodeType === "BOSS" ? "王" : ""}</em></i>)}
              </div>
              {routeOptions.length ? (
                <div className="route-option-list">
                  {routeOptions.map((route) => (
                    <button
                      key={route.routeId}
                      className={`route-option route-${route.primaryArchetype.toLowerCase()} ${focusedRouteId === route.routeId ? "is-focused" : ""}`}
                      onClick={() => focusRoute(route)}
                    >
                      <span className="route-card-art" aria-hidden="true">{route.nodeType === "ELITE" ? "♞" : route.nodeType === "BOSS" ? "♛" : route.primaryArchetype === "SAFE" ? "❖" : route.primaryArchetype === "RISK_REWARD" ? "☠" : "✦"}</span>
                      <span className="route-card-copy">
                        <small>{routeArchetypeLabels[route.primaryArchetype]} · {"★".repeat(Math.min(3, route.difficultyRating))}</small>
                        <strong>{route.name}</strong>
                        <span className="route-card-meta">{route.advancesBattleSlot ? "含战斗" : "独立服务"} · 约 {route.estimatedDurationSec} 秒 · {routeServiceLabels[route.serviceType]}</span>
                        <em>{route.uiSummary.riskText}</em>
                        <b>{route.uiSummary.rewardText}</b>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="route-empty"><strong>路线存档不完整</strong><span>重置本章后可重新生成稳定路线。</span><button onClick={resetRun}>重置本章</button></div>
              )}
              <footer>
                <div className={`route-focus-detail ${focusedRoute ? "is-visible" : ""}`}>
                  {focusedRoute ? <><strong>{focusedRoute.name}</strong><span>{focusedRoute.description}</span><em>机制：{focusedRoute.mechanicTags.join(" · ")}　服务：{routeServiceLabels[focusedRoute.serviceType]}　{focusedRoute.advancesBattleSlot ? "完成后进入战斗" : "不推进战斗槽位"}</em></> : <span>点击一张卡查看详情，再确认前往。</span>}
                </div>
                <button className="primary-action route-enter-button" disabled={!focusedRoute} onClick={chooseFocusedRoute}>{focusedRoute?.advancesBattleSlot === false ? "进入独立服务" : `前往第 ${routeTargetIndex + 1} 关`} <span>→</span></button>
              </footer>
            </div>
          </div>
        )}

        {routeService && routeServiceSession && (
          <div className="modal-backdrop route-service-backdrop" role="dialog" aria-modal="true" aria-label="路线服务">
            <div className="route-service-card">
              <span className="service-icon">{routeService.serviceType === "SHOP" ? "◆" : routeService.serviceType === "REST" ? "♨" : routeService.serviceType === "WORKSHOP" ? "⚒" : routeService.serviceType === "EVENT" ? "✦" : "◎"}</span>
              <small>ROUTE SERVICE · {routeServiceLabels[routeService.serviceType]}</small><h2>{routeService.name}</h2>
              <p>{routeService.advancesBattleSlot ? `完成后进入第 ${routeTargetIndex + 1} 关。` : `这是独立服务，完成后仍停留在 ${routeTargetIndex + 1} / 10。`} 当前金币：<strong>{gold}</strong></p>
              {routeServiceSession.challenge ? (
                <div className="micro-challenge">
                  <div className="micro-status"><span>独立发射次数 <b>{routeServiceSession.challenge.shotsRemaining}/{routeServiceSession.challenge.shotBudget}</b></span><span>命中 <b>{routeServiceSession.challenge.score}/3</b></span></div>
                  <div className="micro-board" aria-label="三发弹珠试炼">
                    {routeServiceSession.challenge.targetIds.map((targetId, index) => (
                      <button key={targetId} className={`micro-target target-${index} ${routeServiceSession.challenge?.hitTargetIds.includes(targetId) ? "is-hit" : ""}`} disabled={routeServiceSession.completed || routeServiceSession.challenge?.hitTargetIds.includes(targetId)} onClick={() => shootMicroChallenge(targetId)} aria-label={`命中目标 ${index + 1}`}>{routeServiceSession.challenge?.hitTargetIds.includes(targetId) ? "✓" : "●"}</button>
                    ))}
                    <i className="micro-launcher">发射器</i>
                  </div>
                  <button className="secondary-action micro-miss" disabled={routeServiceSession.completed} onClick={() => shootMicroChallenge("MISS")}>模拟射偏（消耗 1 发）</button>
                  <small className="micro-reward">命中 3 个：10 金币 + 彩虹球；命中 2 个：6 金币；其他：3 金币</small>
                </div>
              ) : (
                <div className="service-offer-grid">
                  {routeServiceOffers.map((offer) => {
                    const purchased = routeServiceSession.purchasedOfferIds.includes(offer.offerId);
                    const available = canApplyServiceOffer(offer, makeRouteServiceContext()) && !purchased && !routeServiceSession.completed;
                    const insufficient = gold < offer.price;
                    return <button key={offer.offerId} className={`service-offer ${purchased ? "is-purchased" : ""}`} disabled={!available} onClick={() => applyRouteServiceOffer(offer.offerId)}>
                      <i>{purchased ? "✓" : offer.icon}</i><strong>{offer.name}</strong><span>{offer.description}</span><em>{purchased ? "已购买" : insufficient ? `金币不足 · 需要 ${offer.price}` : offer.offerId === "SHOP_LEAVE_GRANT_3" ? "领取 3 金币并离店" : offer.price ? `${offer.price} 金币` : "免费选择"}</em>
                    </button>;
                  })}
                </div>
              )}
              {routeService.serviceType === "SHOP" && <>
                <small className="service-limit">已购买 {routeServiceSession.choicesMade} / {routeServiceSession.maxChoices}；删球与诅咒净化会随本局购买次数涨价。</small>
                <button
                  className="secondary-action"
                  disabled={routeServiceSession.completed || routeServiceSession.rerollCount >= 3 || gold < (getShopRerollPrice(routeServiceSession.rerollCount) ?? Number.POSITIVE_INFINITY)}
                  onClick={rerollRouteShop}
                >重抽商品（{getShopRerollPrice(routeServiceSession.rerollCount) ?? "已达上限"}{getShopRerollPrice(routeServiceSession.rerollCount) === undefined ? "" : " 金币"}）</button>
              </>}
              <button className="primary-action" disabled={routeService.serviceType !== "SHOP" && !routeServiceSession.completed} onClick={() => completeRouteService(routeService, routeServiceSession.seed)}>{routeService.advancesBattleSlot ? "完成服务并进入战斗" : "完成服务并重新选择路线"} <span>→</span></button>
            </div>
          </div>
        )}

        {result !== "playing" && (
          <div className="modal-backdrop result-modal" role="dialog" aria-modal="true">
            <div className={`result-card result-${result}`}>
              <span className="result-crown">{result === "win" ? "♛" : result === "downed" && failureState?.reason === "SHOT_LIMIT_EXHAUSTED" ? "◎" : result === "downed" ? "♥" : "☠"}</span>
              <small>{chapterComplete ? "CHAPTER COMPLETE" : result === "win" ? "BATTLE CLEARED" : result === "downed" && failureState?.reason === "SHOT_LIMIT_EXHAUSTED" ? "OUT OF SHOTS" : result === "downed" ? "PLAYER DOWNED" : "RUN ENDED"}</small>
              <h2>{chapterComplete ? "第一章通关！" : result === "win" ? `${level.name}已被击败！` : result === "downed" && failureState?.reason === "SHOT_LIMIT_EXHAUSTED" ? "发射次数耗尽" : result === "downed" ? "生命归零，冒险尚有转机" : "这次冒险结束了"}</h2>
              {result === "win" ? (
                chapterComplete ? (
                  <><p>蛛后已倒下。第一章挑战完成；Boss 不掉落遗物。剩余局内金币已按 8:1 转换并清零。</p><div className="settlement-grid"><span><small>局外资源</small><strong>+{runSettlement?.metaCurrency ?? 0}（总计 {runSettlement?.metaCurrencyBalance ?? metaCurrency}）</strong></span><span><small>局内金币</small><strong>0</strong></span></div><button className="primary-action" onClick={resetRun}>重新挑战第一章 <span>↻</span></button></>
                ) : (
                  <>
                    <p>本战获得金币 <strong>+{lastBattleGold?.totalGold ?? 0}</strong>。{level.order === 10 ? "选择章节结算奖励。" : `先选择战后奖励，再选择第 ${level.order + 1} 关路线。`}</p>
                    {lastBattleGold && <div className="settlement-grid">
                      <span><small>基础</small><strong>{lastBattleGold.baseGold + lastBattleGold.fixedEncounterBonus + lastBattleGold.extraEncounterBonus}</strong></span>
                      <span><small>金币泡泡</small><strong>{lastBattleGold.coinBubbleGold}</strong></span>
                      <span><small>表现</small><strong>{lastBattleGold.performanceGold}</strong></span>
                      <span><small>路线加成</small><strong>{lastBattleGold.routeModifierGold}</strong></span>
                      <span><small>遗物</small><strong>{lastBattleGold.relicGold}</strong></span>
                      <span><small>当前金币</small><strong>{gold}</strong></span>
                    </div>}
                    <div className="reward-grid">
                      {rewardCards.map((reward) => (
                        <button key={reward.id} className={selectedReward === reward.id ? "is-selected" : ""} onClick={() => setSelectedReward(reward.id)}>
                          <i>{reward.icon}</i><small>{reward.rarity}</small><strong>{reward.name}</strong><span>{reward.desc}</span>
                        </button>
                      ))}
                    </div>
                    <button className="primary-action" disabled={!selectedReward} onClick={continueWithReward}>{level.order === 10 ? "领取章节奖励" : "确认奖励并选择路线"} <span>→</span></button>
                  </>
                )
              ) : result === "downed" && failureState ? (
                failureState.reason === "SHOT_LIMIT_EXHAUSTED" ? (
                  <>
                    <p>最后一发已完整结算，但<strong>{level.name}</strong>仍未被击败。</p>
                    <div className="downed-summary">
                      <span><small>已发射</small><strong>{shotBudget.consumedShots}</strong></span>
                      <span><small>基础次数</small><strong>{shotBudget.baseShotLimit}</strong></span>
                      <span><small>阶段奖励</small><strong>+{shotBudget.phaseGrantedShots}</strong></span>
                      <span><small>继续可获得</small><strong>+{shotBudgetConfig.continueShots} 发</strong></span>
                    </div>
                    {shotLimitContinueAvailable ? (
                      <button className="primary-action revive-action" onClick={continueAfterShotLimit}>追加 {shotBudgetConfig.continueShots} 发并继续 <span>◎</span></button>
                    ) : (
                      <p className="revive-unavailable">本场继续机会已使用，无法再次追加发射次数。</p>
                    )}
                    <button className="give-up-action" onClick={finalizeFailedRun}>{shotLimitContinueAvailable ? "放弃本局" : "进入本局结算"}</button>
                  </>
                ) : (
                <>
                  <p>失败原因：<strong>玩家生命归零</strong> · 致命来源：<strong>{failureState.sourceId || "未知来源"}</strong></p>
                  <div className="downed-summary">
                    <span><small>复活后生命</small><strong>{reviveHpPreview} / {health.maxHp}</strong></span>
                    <span><small>复活后护盾</small><strong>{reviveShieldPreview} / {health.shieldMax}</strong></span>
                    <span><small>复活次数</small><strong>本场 {health.reviveCountThisBattle}/{survivalConfig.revive.maxManualRevivesPerBattle} · 本局 {health.reviveCountThisRun}/{survivalConfig.revive.maxManualRevivesPerRun}</strong></span>
                    <span><small>盘面缓解</small><strong>移除底部 5 球</strong></span>
                  </div>
                  {manualReviveAvailable ? (
                    <button className="primary-action revive-action" onClick={revivePlayer}>主动复活并继续 <span>♥</span></button>
                  ) : (
                    <p className="revive-unavailable">本局主动复活次数已用完，无法继续战斗。</p>
                  )}
                  <button className="give-up-action" onClick={finalizeFailedRun}>{manualReviveAvailable ? "放弃本局" : "进入本局结算"}</button>
                </>
                )
              ) : (
                <>
                  <p>本局构筑已清除，局外成长和历史记录保留。</p>
                  <div className="settlement-grid">
                    <span><small>到达关卡</small><strong>第 {runSettlement?.reachedLevel ?? level.order} 关</strong></span>
                    <span><small>失败原因</small><strong>{runSettlement?.failureReason === "PLAYER_HP_ZERO" ? "生命归零" : runSettlement?.failureReason === "SHOT_LIMIT_EXHAUSTED" ? "发射次数耗尽" : (runSettlement?.failureReason ?? "未知")}</strong></span>
                    <span><small>总生命伤害</small><strong>{runSettlement?.totalDamageTaken ?? runDamageTaken}</strong></span>
                    <span><small>最大单次掉落</small><strong>{runSettlement?.maxSingleDrop ?? maxSingleDrop}</strong></span>
                    <span><small>遗物数量</small><strong>{runSettlement?.relicCount ?? 0}</strong></span>
                    <span><small>球包改造</small><strong>{runSettlement?.bagChanges ?? bagChanges} 次</strong></span>
                    <span><small>局外资源</small><strong>+{runSettlement?.metaCurrency ?? 0}（总计 {runSettlement?.metaCurrencyBalance ?? metaCurrency}）</strong></span>
                  </div>
                  <button className="primary-action" onClick={resetRun}>开始新的冒险 <span>↻</span></button>
                </>
              )}
            </div>
          </div>
        )}
      </section>
      <p className="demo-caption">泡泡射手 Roguelite · 第一章 10 关试玩版 · {level.spawn.ruleSummary}</p>
    </main>
  );
}
