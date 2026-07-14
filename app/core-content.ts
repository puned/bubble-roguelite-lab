import ballBoardJson from "../configs/core/balls-board-v1.json" with { type: "json" };
import characterJson from "../configs/core/characters-v1.json" with { type: "json" };
import enemyJson from "../configs/core/chapter1-enemies-v1.json" with { type: "json" };
import relicJson from "../configs/core/relics-v1.json" with { type: "json" };
import statusCoreJson from "../configs/core/status-core-v1.json" with { type: "json" };

export type BallType = "NORMAL" | "SPECIAL" | "UTILITY" | "CURSE";
export type BubbleType = "NORMAL" | "OBSTACLE" | "HAZARD" | "REWARD" | "SPECIAL" | "CORE";
export type RelicRarity = "COMMON" | "RARE" | "EPIC" | "BOSS";
export type StatusTarget = "PLAYER" | "ENEMY";
export type TriggerType = string;
export type EffectType = string;
export type ConditionType = string;
export type IntentType = string;

export type Effect = {
  effectType: EffectType;
  trigger?: TriggerType;
  [key: string]: unknown;
};

export type Condition = {
  type: ConditionType;
  value?: unknown;
  [key: string]: unknown;
};

export type BallDefinition = {
  ballId: string;
  name: string;
  implementationPriority?: "P0" | "P1";
  ballType: BallType;
  equivalentColor: string;
  canMatch: boolean;
  attachMode: string;
  exhaustOnUse: boolean;
  isTemporary?: boolean;
  removeAfterBattle?: boolean;
  colorSelectionRule?: string[];
  effects: Effect[];
};

export type BoardBubbleDefinition = {
  bubbleId: string;
  name: string;
  bubbleType: BubbleType;
  color: string;
  canMatch: boolean;
  canDetachDrop: boolean;
  countsForBoardClear: boolean;
  overflowWeight: number;
  implementationPriority?: "P0" | "P1";
  [key: string]: unknown;
};

export type BoardModifierDefinition = {
  modifierId: string;
  name: string;
  implementationPriority?: "P0" | "P1";
  rules: Record<string, unknown>;
};

export type RelicDefinition = {
  relicId: string;
  name: string;
  rarity: RelicRarity;
  tags: string[];
  trigger: TriggerType;
  conditions?: Condition[];
  effects: Effect[];
  limits?: Record<string, number>;
  stackRule: "UNIQUE" | "UPGRADE";
};

export type StatusDefinition = {
  statusId: string;
  name: string;
  target: StatusTarget;
  triggerTiming: string;
  stackMode: string;
  effects?: Effect[];
  [key: string]: unknown;
};

export type IntentDefinition = {
  intentId: string;
  displayName: string;
  effects: Effect[];
  limits?: Record<string, number>;
};

export type EnemyDefinition = {
  enemyId: string;
  name: string;
  enemyType: "NORMAL" | "ELITE";
  defaultLevelId?: string;
  hp: number;
  shield: number;
  pressureMax: number;
  intentIntervalShots: number;
  intentCycle: IntentDefinition[];
  passives?: Effect[];
};

export type BossPhaseDefinition = {
  phaseId: string;
  name: string;
  hp: number;
  shield: number;
  pressureMax: number;
  intentIntervalShots: number;
  onPhaseStart: Effect[];
  intentCycle: IntentDefinition[];
  passives?: Effect[];
};

export type BossDefinition = {
  bossId: string;
  name: string;
  enemyType: "BOSS";
  totalHp: number;
  totalShield: number;
  phaseGate: { enabled: boolean; overkillCarryRate: number; resetIntentOnPhaseChange: boolean };
  phaseShotGrants: Array<{ afterPhaseId: string; grantShots: number }>;
  phases: BossPhaseDefinition[];
  coreRule: Record<string, unknown>;
};

export type SkillDefinition = {
  skillId: string;
  name: string;
  trigger?: TriggerType;
  energyCost?: number;
  conditions?: Condition[];
  effects: Effect[];
  limits?: Record<string, number>;
  consumeShotBudget?: boolean;
};

export type CharacterDefinition = {
  characterId: string;
  name: string;
  implementationPriority: "P0" | "P1";
  maxHp: number;
  initialGold: number;
  initialBallBag: Array<{ ballId: string; count: number }>;
  passiveSkill: SkillDefinition;
  activeSkill: SkillDefinition;
};

type BallBoardConfig = {
  schemaVersion: string;
  globalRules: Record<string, unknown>;
  launcherBalls: BallDefinition[];
  boardBubbles: BoardBubbleDefinition[];
  boardModifiers: BoardModifierDefinition[];
};
type RelicConfig = { schemaVersion: string; globalRules: Record<string, unknown>; relics: RelicDefinition[] };
type StatusCoreConfig = {
  schemaVersion: string;
  damage: Record<string, unknown> & { dropDamageCaps: Record<string, number>; bossVulnerableMultiplier: number; bossPhaseOverkillCarryRate: number };
  ballBag: Record<string, unknown>;
  shotResolutionPriority: string[];
  pressure: Record<string, unknown>;
  boardClearRefill: Record<string, unknown>;
  playerHealth: Record<string, unknown>;
  failure: Record<string, unknown>;
  statuses: StatusDefinition[];
};
type EnemyConfig = {
  schemaVersion: string;
  globalIntentRules: Record<string, unknown>;
  chapter1NormalEnemies: EnemyDefinition[];
  chapter1ElitePool: EnemyDefinition[];
  chapter1Bosses: BossDefinition[];
  futureBossTemplates: Array<Record<string, unknown>>;
};
type CharacterConfig = { schemaVersion: string; characters: CharacterDefinition[]; p1CharacterArchetypes: Array<Record<string, unknown>> };

export const ballBoardConfig = ballBoardJson as BallBoardConfig;
export const relicConfig = relicJson as RelicConfig;
export const statusCoreConfig = statusCoreJson as StatusCoreConfig;
export const enemyConfig = enemyJson as EnemyConfig;
export const characterConfig = characterJson as CharacterConfig;

const launcherBallMap = new Map(ballBoardConfig.launcherBalls.map((item) => [item.ballId, item]));
const boardBubbleMap = new Map(ballBoardConfig.boardBubbles.map((item) => [item.bubbleId, item]));
const boardModifierMap = new Map(ballBoardConfig.boardModifiers.map((item) => [item.modifierId, item]));
const relicMap = new Map(relicConfig.relics.map((item) => [item.relicId, item]));
const statusMap = new Map(statusCoreConfig.statuses.map((item) => [item.statusId, item]));
const enemyMap = new Map([...enemyConfig.chapter1NormalEnemies, ...enemyConfig.chapter1ElitePool].map((item) => [item.enemyId, item]));
const bossMap = new Map(enemyConfig.chapter1Bosses.map((item) => [item.bossId, item]));
const characterMap = new Map(characterConfig.characters.map((item) => [item.characterId, item]));

export const getBallDefinition = (id: string) => launcherBallMap.get(id);
export const getBoardBubbleDefinition = (id: string) => boardBubbleMap.get(id);
export const getBoardModifierDefinition = (id: string) => boardModifierMap.get(id);
export const getRelicDefinition = (id: string) => relicMap.get(id);
export const getStatusDefinition = (id: string) => statusMap.get(id);
export const getEnemyDefinition = (id: string) => enemyMap.get(id);
export const getBossDefinition = (id: string) => bossMap.get(id);
export const getCharacterDefinition = (id: string) => characterMap.get(id);

const supportedEffectTypes = new Set([
  "CLEAR_RADIUS", "ADD_STATUS_TO_ENEMY", "MODIFY_PRESSURE", "IGNORE_FIRST_BOARD_COLLISION", "HEAL_PLAYER",
  "ADD_PLAYER_SHIELD", "ADD_SKILL_ENERGY", "ADD_BOARD_MODIFIER", "ADD_STATUS_TO_PLAYER", "ADD_GOLD",
  "LOSE_REWARD_OBJECT", "DESTROY_SELF_NO_REWARD", "DAMAGE_PLAYER", "MODIFY_PLAYER_SPECIAL_EFFECT",
  "SPAWN_COLORED_BUBBLES", "ADD_BOARD_TAG", "TRANSFORM_BOARD_BUBBLE", "MULTIPLY_INCOMING_DROP_DAMAGE",
  "SPAWN_BOARD_BUBBLE", "SPREAD_BOARD_BUBBLE_TYPE", "RESTORE_ENEMY_SHIELD", "TRANSFORM_CURRENT_BALL",
  "MODIFY_RESERVE_SLOT_COUNT", "DAMAGE_ENEMY_BY_COUNT", "ADD_PLAYER_SHIELD_BY_COUNT", "GRANT_SHOTS",
  "TRANSFORM_RANDOM_NEIGHBOR_BUBBLE", "MODIFY_STATUS_DAMAGE", "TEMPORARILY_TRANSFORM_CURRENT_BALL",
  "MODIFY_CLEAR_RADIUS", "MULTIPLY_CURRENT_SHOT_DAMAGE", "CANCEL_PENDING_STATUS", "ADD_PRE_BATTLE_BONUS_SHOTS",
  "MODIFY_SPECIAL_EFFECT_MAGNITUDE", "MODIFY_REWARD_RARITY_WEIGHT", "SPAWN_RANDOM_OBSTACLES", "SET_PLAYER_HP",
  "RESET_PRESSURE", "RESTORE_PLAYER_HP_PERCENT", "REMOVE_RELIC_SELF", "MODIFY_STATUS_DAMAGE_AGAINST_BOSS",
  "MULTIPLY_PENDING_DAMAGE", "EXTEND_ENEMY_STATUS_DURATION", "DISABLE_RESERVE_SWAP",
]);
const supportedTargetRules = new Set([
  "RANDOM_VALID_EXISTING_BUBBLE", "NEAR_EGG_VALID_BUBBLE", "RANDOM_NORMAL_BUBBLE", "MIDDLE_NORMAL_NON_CRITICAL",
  "LOWEST_VALID_BUBBLE", "CRITICAL_SUPPORT_BUBBLE_NOT_UNIQUE_PATH",
]);
const supportedPositionRules = new Set(["TOP_SAFE_RANDOM", "MIDDLE_SAFE_RANDOM", "NON_CRITICAL_PATH", "CENTER_NEAR"]);

function duplicateIds(ids: string[], label: string, errors: string[]) {
  const seen = new Set<string>();
  ids.forEach((id) => {
    if (seen.has(id)) errors.push(`${label} 存在重复 ID：${id}`);
    seen.add(id);
  });
}

function visitEffects(value: unknown, sourceId: string, errors: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => visitEffects(item, sourceId, errors));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.effectType === "string" && !supportedEffectTypes.has(record.effectType)) errors.push(`${sourceId} 使用未知 Effect：${record.effectType}`);
  if (typeof record.statusId === "string" && !statusMap.has(record.statusId)) errors.push(`${sourceId} 引用不存在的状态：${record.statusId}`);
  if (typeof record.modifierId === "string" && !boardModifierMap.has(record.modifierId)) errors.push(`${sourceId} 引用不存在的修饰：${record.modifierId}`);
  for (const key of ["ballId", "toBallId"]) {
    if (typeof record[key] === "string" && !launcherBallMap.has(String(record[key]))) errors.push(`${sourceId} 引用不存在的发射球：${record[key]}`);
  }
  for (const key of ["bubbleId", "toBubbleId", "sourceBubbleId"]) {
    if (typeof record[key] === "string" && !boardBubbleMap.has(String(record[key]))) errors.push(`${sourceId} 引用不存在的棋盘对象：${record[key]}`);
  }
  if (typeof record.targetRule === "string" && !supportedTargetRules.has(record.targetRule)) errors.push(`${sourceId} 使用未知 targetRule：${record.targetRule}`);
  if (typeof record.positionRule === "string" && !supportedPositionRules.has(record.positionRule)) errors.push(`${sourceId} 使用未知 positionRule：${record.positionRule}`);
  Object.values(record).forEach((child) => visitEffects(child, sourceId, errors));
}

export function validateCoreContent() {
  const errors: string[] = [];
  const versions = [ballBoardConfig.schemaVersion, relicConfig.schemaVersion, statusCoreConfig.schemaVersion, enemyConfig.schemaVersion, characterConfig.schemaVersion];
  if (versions.some((version) => version !== "1.0")) errors.push(`核心配置 schemaVersion 不一致：${versions.join(",")}`);
  duplicateIds(ballBoardConfig.launcherBalls.map((item) => item.ballId), "发射球", errors);
  duplicateIds(ballBoardConfig.boardBubbles.map((item) => item.bubbleId), "棋盘对象", errors);
  duplicateIds(ballBoardConfig.boardModifiers.map((item) => item.modifierId), "盘面修饰", errors);
  duplicateIds(relicConfig.relics.map((item) => item.relicId), "遗物", errors);
  duplicateIds(statusCoreConfig.statuses.map((item) => item.statusId), "状态", errors);
  duplicateIds([...enemyConfig.chapter1NormalEnemies, ...enemyConfig.chapter1ElitePool].map((item) => item.enemyId), "怪物", errors);
  duplicateIds(enemyConfig.chapter1Bosses.map((item) => item.bossId), "Boss", errors);
  ballBoardConfig.launcherBalls.forEach((item) => visitEffects(item, item.ballId, errors));
  ballBoardConfig.boardBubbles.forEach((item) => visitEffects(item, item.bubbleId, errors));
  statusCoreConfig.statuses.forEach((item) => visitEffects(item, item.statusId, errors));
  relicConfig.relics.forEach((item) => visitEffects(item, item.relicId, errors));
  [...enemyConfig.chapter1NormalEnemies, ...enemyConfig.chapter1ElitePool].forEach((item) => visitEffects(item, item.enemyId, errors));
  enemyConfig.chapter1Bosses.forEach((boss) => {
    visitEffects(boss, boss.bossId, errors);
    if (boss.phases.reduce((sum, phase) => sum + phase.hp, 0) !== boss.totalHp) errors.push(`${boss.bossId} 阶段 HP 之和不等于 totalHp`);
    if (boss.phases.reduce((sum, phase) => sum + phase.shield, 0) !== boss.totalShield) errors.push(`${boss.bossId} 阶段护盾之和不等于 totalShield`);
    const phaseIds = new Set(boss.phases.map((phase) => phase.phaseId));
    boss.phaseShotGrants.forEach((grant) => {
      if (!phaseIds.has(grant.afterPhaseId)) errors.push(`${boss.bossId} 阶段发射奖励引用不存在阶段：${grant.afterPhaseId}`);
    });
  });
  characterConfig.characters.forEach((character) => {
    character.initialBallBag.forEach((entry) => {
      if (!launcherBallMap.has(entry.ballId)) errors.push(`${character.characterId} 初始球包引用不存在球：${entry.ballId}`);
      if (!(entry.count > 0)) errors.push(`${character.characterId} 初始球数量必须大于 0：${entry.ballId}`);
    });
    visitEffects(character, character.characterId, errors);
  });
  return errors;
}

export function assertCoreContentValid() {
  const errors = validateCoreContent();
  if (errors.length) throw new Error(`核心战斗配置无效：${errors.join("；")}`);
}

assertCoreContentValid();

export type EffectQueueItem = { sourceId: string; targetId?: string; effect: Effect };
export type EffectResolution = { followUps?: EffectQueueItem[]; event?: Record<string, unknown> } | void;
export type EffectResolver = (item: EffectQueueItem) => EffectResolution;

export class EffectQueue {
  private readonly pending: EffectQueueItem[] = [];

  enqueue(item: EffectQueueItem) {
    this.pending.push(item);
  }

  enqueueMany(items: EffectQueueItem[]) {
    this.pending.push(...items);
  }

  get size() {
    return this.pending.length;
  }

  drain(resolver: EffectResolver, maxEffects = 512) {
    const events: Record<string, unknown>[] = [];
    let resolved = 0;
    while (this.pending.length) {
      if (resolved >= maxEffects) throw new Error(`EffectQueue 超过单次上限 ${maxEffects}，疑似递归触发`);
      const item = this.pending.shift()!;
      const result = resolver(item);
      resolved += 1;
      if (result?.event) events.push(result.event);
      if (result?.followUps?.length) this.pending.push(...result.followUps);
    }
    return { resolved, events };
  }
}

export function getCharacterInitialBallIds(characterId = "CHAR_FIRE_BOY") {
  const character = getCharacterDefinition(characterId);
  if (!character) throw new Error(`未找到角色：${characterId}`);
  return character.initialBallBag.flatMap((entry) => Array.from({ length: entry.count }, () => entry.ballId));
}
