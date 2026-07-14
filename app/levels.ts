export type IntentAction =
  | "ATTACK"
  | "SLIME_BIG"
  | "STONE"
  | "POISON"
  | "ELITE_COMBO"
  | "ICE_SPRITE"
  | "BAT_TRICKSTER"
  | "GHOST_PAINTER"
  | "WEB_ACOLYTE"
  | "SPIDER_QUEEN"
  | "WEB"
  | "HIDE"
  | "CHAIN"
  | "MIMIC"
  | "ACOLYTE"
  | "SLIME_KING";

export type RewardEffect =
  | "ADD_RED"
  | "ADD_BLUE"
  | "ADD_BOMB"
  | "ADD_FIRE"
  | "ADD_ICE"
  | "ADD_RAINBOW"
  | "ADD_PIERCE"
  | "REMOVE_NORMAL"
  | "HEAL_4"
  | "HEAL_6"
  | "HEAL_8"
  | "GOLD_12"
  | "GOLD_20"
  | "WEB_CUTTER"
  | "PREVIEW_LENS"
  | "PHOENIX_FEATHER"
  | "MAX_HP_8"
  | "ADD_RELIC"
  | "BOSS_RELIC";

export type RewardOption = {
  id: string;
  icon: string;
  name: string;
  rarity: string;
  desc: string;
  effect: RewardEffect;
  relicId?: string;
};

export type TemporaryBallRule = {
  kinds: Array<"bomb" | "fire" | "rainbow">;
  placement: "WITHIN_OPENING" | "RESERVE" | "DISCARD" | "RANDOM";
  within?: number;
  condition: "NO_CLEAR_SPECIAL" | "NO_SPECIAL" | "LOW_COLOR_SET" | "NO_BLUE_OR_FREEZE";
};

export type PressureSpawnRules = {
  density: number;
  stoneRate?: number;
  webRate?: number;
  poisonRate?: number;
  hiddenRate?: number;
  frozenRate?: number;
  specialRate?: number;
};

export type SpawnRules = {
  boardDensity: number;
  bottomSafetyRows: number;
  openingChoices: number;
  openingProtectedDraws: number;
  pressure: PressureSpawnRules;
  temporary?: TemporaryBallRule;
  antiStallMax?: number;
  ruleSummary: string;
};

export type LevelConfig = {
  id: string;
  order: number;
  nodeType: "NORMAL_BATTLE" | "ELITE_BATTLE" | "BOSS_BATTLE";
  typeLabel: string;
  enemyId: string;
  name: string;
  glyph: string;
  accent: string;
  hp: number;
  colorSlotCount: 3 | 4;
  pressureMax: number;
  rows: number;
  steps: number;
  baseGold: number;
  objective: string;
  mechanic: string;
  intentLabel: string;
  intentEvery: number;
  intentAction: IntentAction;
  overlays: {
    stone?: number;
    web?: number;
    poison?: number;
    hidden?: number;
    chain?: number;
    coin?: number;
    chest?: number;
    core?: number;
    frozen?: number;
    weakpoint?: number;
    boardBomb?: number;
    boardRainbow?: number;
    charge?: number;
    slime?: number;
  };
  openingBall?: "bomb" | "fire" | "rainbow";
  pressureOverflowOverride?: {
    damageCap?: number;
    boardDropRows?: number;
    repeatDamageIncrease?: number;
  };
  spawn: SpawnRules;
  rewardIds: [string, string, string];
};

export const rewardCatalog: Record<string, RewardOption> = {
  addRed: { id: "addRed", icon: "红", name: "红球 ×1", rarity: "普通球包", desc: "向球包加入一颗红球。", effect: "ADD_RED" },
  addBlue: { id: "addBlue", icon: "蓝", name: "蓝球 ×1", rarity: "普通球包", desc: "向球包加入一颗蓝球。", effect: "ADD_BLUE" },
  bomb: { id: "bomb", icon: "爆", name: "炸弹球", rarity: "特殊球", desc: "命中后清除半径一格。", effect: "ADD_BOMB" },
  fire: { id: "fire", icon: "火", name: "火焰球", rarity: "特殊球", desc: "范围清除并视为红色。", effect: "ADD_FIRE" },
  ice: { id: "ice", icon: "冰", name: "冰冻球", rarity: "特殊球", desc: "匹配清除时压力 -1，最低降至 0。", effect: "ADD_ICE" },
  rainbow: { id: "rainbow", icon: "彩", name: "彩虹球", rarity: "稀有球", desc: "自动匹配命中区域颜色。", effect: "ADD_RAINBOW" },
  pierce: { id: "pierce", icon: "穿", name: "穿透球", rarity: "稀有球", desc: "忽略第一次碰撞，并复制落点相邻颜色。", effect: "ADD_PIERCE" },
  remove: { id: "remove", icon: "−", name: "精简球包", rarity: "构筑调整", desc: "移除一颗数量最多的普通球。", effect: "REMOVE_NORMAL" },
  heal4: { id: "heal4", icon: "+", name: "回复 4 HP", rarity: "补给", desc: "恢复 4 点生命。", effect: "HEAL_4" },
  heal6: { id: "heal6", icon: "+", name: "回复 6 HP", rarity: "补给", desc: "恢复 6 点生命。", effect: "HEAL_6" },
  heal8: { id: "heal8", icon: "+", name: "回复 8 HP", rarity: "Boss 前补给", desc: "恢复 8 点生命。", effect: "HEAL_8" },
  gold12: { id: "gold12", icon: "币", name: "金币 ×12", rarity: "资源", desc: "立即获得 12 金币。", effect: "GOLD_12" },
  gold20: { id: "gold20", icon: "宝", name: "金币 ×20", rarity: "贪婪奖励", desc: "立即获得 20 金币。", effect: "GOLD_20" },
  webCutter: { id: "webCutter", icon: "刃", name: "断网刀", rarity: "普通遗物", desc: "清除蛛网时额外获得护盾。", effect: "WEB_CUTTER" },
  preview: { id: "preview", icon: "镜", name: "预览透镜", rarity: "普通遗物", desc: "削弱幽灵的隐藏颜色行动。", effect: "PREVIEW_LENS" },
  phoenix: { id: "phoenix", icon: "羽", name: "凤凰羽毛", rarity: "稀有遗物", desc: "本场首次致命伤害后恢复 30% 最大生命。", effect: "PHOENIX_FEATHER" },
  maxHp: { id: "maxHp", icon: "心", name: "生命上限 +8", rarity: "生存强化", desc: "最大生命提高 8，并同时恢复 8 HP。", effect: "MAX_HP_8" },
  bossRelic: { id: "bossRelic", icon: "冠", name: "蛛后冠冕", rarity: "Boss 遗物", desc: "章节通关纪念，最大生命回复 30%。", effect: "BOSS_RELIC" },
};

export const initialChapterLevel: LevelConfig = {
  id: "CH1_01", order: 1, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_SLIME",
  name: "小史莱姆", glyph: "史", accent: "#53c8ff", hp: 24, colorSlotCount: 3, pressureMax: 6, rows: 10, steps: 18, baseGold: 10,
  objective: "击败敌人", mechanic: "三色低密度与发射节奏教学", intentLabel: "黏液泡泡", intentEvery: 4, intentAction: "ATTACK",
  overlays: { coin: 1, boardBomb: 1 },
  spawn: {
    boardDensity: .72, bottomSafetyRows: 4, openingChoices: 3, openingProtectedDraws: 3,
    pressure: { density: .70, specialRate: .02 },
    ruleSummary: "三色低密度 · 前 3 发可消保护 · 空发 2 次触发保底",
  },
  rewardIds: ["addRed", "fire", "gold12"],
};

export const chapterLevels: LevelConfig[] = [
  initialChapterLevel,
  {
    id: "CH1_02", order: 2, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_SLIME_BIG",
    name: "花园史莱姆", glyph: "藤", accent: "#74c65a", hp: 30, colorSlotCount: 3, pressureMax: 6, rows: 11, steps: 19, baseGold: 11,
    objective: "击败敌人", mechanic: "瞄准上方支撑点制造大面积掉落", intentLabel: "黏液标记", intentEvery: 4, intentAction: "SLIME_BIG",
    overlays: { coin: 2, boardRainbow: 1 },
    spawn: {
      boardDensity: .78, bottomSafetyRows: 3, openingChoices: 2, openingProtectedDraws: 4,
      pressure: { density: .75, specialRate: .02 },
      temporary: { kinds: ["rainbow"], placement: "WITHIN_OPENING", within: 7, condition: "NO_CLEAR_SPECIAL" },
      ruleSummary: "支撑点挂载盘面 · reserve 偏向支撑色 · 缺特殊球临时注入彩虹",
    },
    rewardIds: ["bomb", "remove", "addBlue"],
  },
  {
    id: "CH1_03", order: 3, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_STONE_GUARD_LIGHT",
    name: "毒菇", glyph: "毒", accent: "#8ecb4f", hp: 34, colorSlotCount: 4, pressureMax: 5, rows: 11, steps: 20, baseGold: 12,
    objective: "击败敌人", mechanic: "毒液泡泡持续制造盘面压力", intentLabel: "孢子污染", intentEvery: 4, intentAction: "POISON",
    overlays: { poison: 2, boardBomb: 1, coin: 1 },
    spawn: {
      boardDensity: .82, bottomSafetyRows: 3, openingChoices: 2, openingProtectedDraws: 5,
      pressure: { density: .78, poisonRate: .04, specialRate: .02 },
      temporary: { kinds: ["bomb"], placement: "WITHIN_OPENING", within: 5, condition: "NO_CLEAR_SPECIAL" },
      ruleSummary: "中层 4 个石头 · 前 5 发解障保护 · 石头占比不超过 10%",
    },
    rewardIds: ["bomb", "fire", "remove"],
  },
  {
    id: "CH1_04", order: 4, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_POISON_MUSHROOM",
    name: "石像守卫", glyph: "石", accent: "#95a4ba", hp: 40, colorSlotCount: 4, pressureMax: 5, rows: 11, steps: 21, baseGold: 13,
    objective: "击败敌人", mechanic: "护盾减免掉落伤害，破盾后易伤 1 发", intentLabel: "生成石头", intentEvery: 4, intentAction: "STONE",
    overlays: { stone: 4, boardBomb: 1, coin: 1 },
    spawn: {
      boardDensity: .80, bottomSafetyRows: 3, openingChoices: 2, openingProtectedDraws: 2,
      pressure: { density: .80, stoneRate: .05, specialRate: .02 },
      temporary: { kinds: ["fire"], placement: "WITHIN_OPENING", within: 8, condition: "NO_CLEAR_SPECIAL" },
      ruleSummary: "毒液仅刷在中层安全区 · 毒液达到 5 个时 reserve 反制",
    },
    rewardIds: ["ice", "fire", "heal6"],
  },
  {
    id: "CH1_05", order: 5, nodeType: "ELITE_BATTLE", typeLabel: "精英怪", enemyId: "ELITE_WEB_STONE_GUARD",
    name: "石甲巨像", glyph: "像", accent: "#bd72ff", hp: 70, colorSlotCount: 4, pressureMax: 4, rows: 12, steps: 32, baseGold: 22,
    objective: "击败精英怪", mechanic: "石甲护盾与一次性护盾修复", intentLabel: "石甲行动", intentEvery: 4, intentAction: "ELITE_COMBO",
    overlays: { stone: 6, boardBomb: 1, weakpoint: 1 },
    spawn: {
      boardDensity: .82, bottomSafetyRows: 2, openingChoices: 2, openingProtectedDraws: 6,
      pressure: { density: .82, webRate: .08, stoneRate: .05, specialRate: .01 },
      temporary: { kinds: ["bomb"], placement: "WITHIN_OPENING", within: 6, condition: "NO_CLEAR_SPECIAL" },
      ruleSummary: "障碍总占比 ≤18% · 前 6 发至少 1 个解障机会 · 高阶关不硬喂特殊球",
    },
    rewardIds: ["phoenix", "webCutter", "bomb"],
  },
  {
    id: "CH1_06", order: 6, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_ICE_SPRITE",
    name: "小蜘蛛", glyph: "蛛", accent: "#55d4ee", hp: 46, colorSlotCount: 4, pressureMax: 5, rows: 11, steps: 22, baseGold: 14,
    objective: "击败敌人", mechanic: "随机蛛网阻止支撑泡泡掉落", intentLabel: "蛛网缠绕", intentEvery: 4, intentAction: "ICE_SPRITE",
    overlays: { web: 3, charge: 1 },
    spawn: {
      boardDensity: .82, bottomSafetyRows: 3, openingChoices: 2, openingProtectedDraws: 2,
      pressure: { density: .82, frozenRate: .05, stoneRate: .02, specialRate: .02 },
      temporary: { kinds: ["rainbow"], placement: "DISCARD", condition: "NO_BLUE_OR_FREEZE" },
      ruleSummary: "蓝色槽位轻微加权 · 高压时 next/reserve 偏向减压色",
    },
    rewardIds: ["ice", "rainbow", "heal4"],
  },
  {
    id: "CH1_07", order: 7, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_BAT_TRICKSTER",
    name: "毒液花灵", glyph: "花", accent: "#d89e52", hp: 52, colorSlotCount: 4, pressureMax: 5, rows: 12, steps: 23, baseGold: 15,
    objective: "击败敌人", mechanic: "污染泡泡并逐步强化毒液区域", intentLabel: "毒液污染", intentEvery: 4, intentAction: "BAT_TRICKSTER",
    overlays: { poison: 2, boardRainbow: 1, weakpoint: 1 },
    spawn: {
      boardDensity: .78, bottomSafetyRows: 2, openingChoices: 2, openingProtectedDraws: 2,
      pressure: { density: .78, stoneRate: .02, specialRate: .03 },
      temporary: { kinds: ["rainbow"], placement: "RESERVE", condition: "NO_CLEAR_SPECIAL" },
      ruleSummary: "左右侧道与反弹路径 · 临时彩虹仅放 reserve，由玩家决定使用",
    },
    rewardIds: ["gold20", "rainbow", "bomb"],
  },
  {
    id: "CH1_08", order: 8, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_GHOST_PAINTER",
    name: "镜影怪", glyph: "镜", accent: "#9a75e8", hp: 56, colorSlotCount: 4, pressureMax: 5, rows: 12, steps: 24, baseGold: 16,
    objective: "击败敌人", mechanic: "镜像泡泡削弱特殊球，清除后触发易伤", intentLabel: "镜像扰动", intentEvery: 4, intentAction: "GHOST_PAINTER",
    overlays: { hidden: 3, boardRainbow: 1 },
    spawn: {
      boardDensity: .80, bottomSafetyRows: 2, openingChoices: 2, openingProtectedDraws: 2,
      pressure: { density: .80, hiddenRate: .08, specialRate: .02 },
      temporary: { kinds: ["rainbow"], placement: "RANDOM", condition: "LOW_COLOR_SET" },
      ruleSummary: "幻影不超过初始盘面 10% · 删除颜色不会重新进入盘面",
    },
    rewardIds: ["heal6", "pierce", "remove"],
  },
  {
    id: "CH1_09", order: 9, nodeType: "NORMAL_BATTLE", typeLabel: "普通怪", enemyId: "ENEMY_WEB_ACOLYTE",
    name: "蛛网守卫", glyph: "巢", accent: "#7c78de", hp: 64, colorSlotCount: 4, pressureMax: 5, rows: 12, steps: 25, baseGold: 18,
    objective: "击败敌人", mechanic: "蛛网守卫强化最低处支撑泡泡", intentLabel: "强化蛛网", intentEvery: 4, intentAction: "WEB_ACOLYTE",
    overlays: { web: 3, boardBomb: 1, weakpoint: 1 },
    spawn: {
      boardDensity: .82, bottomSafetyRows: 2, openingChoices: 2, openingProtectedDraws: 6,
      pressure: { density: .82, webRate: .06, specialRate: .01 },
      temporary: { kinds: ["bomb"], placement: "WITHIN_OPENING", within: 6, condition: "NO_CLEAR_SPECIAL" },
      ruleSummary: "核心 4–8 发可达 · 前 6 发至少出现核心路径颜色或解障球",
    },
    rewardIds: ["maxHp", "gold20", "bomb"],
  },
  {
    id: "CH1_10", order: 10, nodeType: "BOSS_BATTLE", typeLabel: "Boss", enemyId: "BOSS_SPIDER_QUEEN",
    name: "蛛后", glyph: "后", accent: "#b85ee8", hp: 180, colorSlotCount: 4, pressureMax: 5, rows: 12, steps: 52, baseGold: 35,
    objective: "击败 Boss", mechanic: "三阶段：织网、产卵、蛛网风暴", intentLabel: "织网", intentEvery: 3, intentAction: "SPIDER_QUEEN",
    overlays: { core: 1, web: 4, weakpoint: 2, boardBomb: 1 },
    spawn: {
      boardDensity: .84, bottomSafetyRows: 2, openingChoices: 2, openingProtectedDraws: 3,
      pressure: { density: .84, webRate: .06 },
      temporary: { kinds: ["bomb", "rainbow"], placement: "WITHIN_OPENING", within: 6, condition: "NO_SPECIAL" },
      antiStallMax: 2,
      ruleSummary: "P1 织网 · P2 蜘蛛卵 · P3 蛛网风暴，第三阶段仅保底 2 次",
    },
    rewardIds: ["gold20", "heal8", "rainbow"],
  },
];
