# 泡泡射手 Roguelite 改造 Codex 执行文档

版本：V1.0  
用途：供 Codex / 代码代理 / 程序团队直接按模块拆分实现。  
适用范围：在现有泡泡射手工程基础上，加入 Roguelite 单局、球包构筑、遗物、Boss、奖励、旧关卡模板复用、战斗 UI 数据绑定。

---

## 0. 实现目标

将现有泡泡射手从“线性关卡制”改造成：

```text
单局 Run
→ 地图节点
→ 战斗盘面
→ 球包抽球
→ 消除 / 掉落 / 压力下降
→ 敌人 / Boss 意图
→ 遗物 / 技能触发
→ 关卡奖励
→ 球包添加 / 删除 / 转换
→ 继续下一节点
→ Boss
→ 下一章节或本局结算
```

### 0.1 必须保留的现有能力

现有工程中如果已经有以下模块，不要重写，只做适配封装：

```text
1. 泡泡发射
2. 轨迹瞄准
3. 墙面反弹
4. 泡泡碰撞
5. 泡泡吸附到棋盘格
6. 同色匹配检测
7. 泡泡消除
8. 悬空泡泡掉落检测
9. 现有 1500 关关卡数据读取
```

### 0.2 新增核心能力

必须新增：

```text
1. 单局 RunState
2. 球包 BallBag
3. 战斗抽球 DrawPile / DiscardPile
4. 当前球 / 下一球 / 备用球
5. 压力下降 Pressure
6. 敌人 / Boss 意图系统
7. 遗物 Relic 事件触发系统
8. 技能 Skill 系统
9. 关卡奖励 Reward
10. 商店 / 事件 / 休息点
11. 1500 旧关卡转模板池
12. UI 数据绑定
```

---

## 1. 推荐目录结构

Codex 按以下目录创建或改造代码：

```text
/src
  /roguelite
    RunManager.ts
    RunState.ts
    MapManager.ts

  /battle
    BattleManager.ts
    BattleState.ts
    BattleEvent.ts
    BattleConfig.ts

  /ball
    BallDefinition.ts
    BallToken.ts
    BallBagManager.ts
    ShotBallGenerator.ts

  /board
    BoardState.ts
    BoardBubble.ts
    BoardManager.ts
    BoardGenerator.ts
    LegacyBoardImporter.ts
    LegacyBoardAnalyzer.ts
    ColorSlotMapper.ts
    BoardValidator.ts
    PressureSystem.ts

  /effect
    Effect.ts
    EffectResolver.ts
    EffectQueue.ts
    Condition.ts

  /relic
    RelicDefinition.ts
    RelicSystem.ts

  /skill
    SkillDefinition.ts
    SkillSystem.ts
    CharacterDefinition.ts

  /enemy
    EnemyDefinition.ts
    EnemySystem.ts
    BossDefinition.ts
    BossSystem.ts

  /reward
    RewardDefinition.ts
    RewardSystem.ts
    ShopSystem.ts
    EventSystem.ts

  /ui
    BattleHUDViewModel.ts
    BossPanelViewModel.ts
    BallTrayViewModel.ts
    BoardViewModel.ts

/config
  balls.json
  relics.json
  skills.json
  characters.json
  enemies.json
  bosses.json
  rewards.json
  encounters.json
  legacy_board_rules.json
```

如工程不是 TypeScript，也按同名模块迁移到对应语言。

---

## 2. 单局 RunState

### 2.1 RunState 定义

```ts
type RunState = {
  runId: string;
  seed: number;

  chapterIndex: number;
  nodeIndex: number;
  difficultyLevel: number;

  playerHp: number;
  playerMaxHp: number;
  gold: number;

  characterId: string;

  ballBag: BallToken[];
  relics: RelicInstance[];
  curses: CurseInstance[];

  currentMap: MapState;
  clearedNodes: string[];

  recentTemplateIds: string[];
  temporaryFlags: string[];
};
```

### 2.2 Run 生命周期

```text
StartRun(characterId)
→ 初始化玩家 HP / 金币 / 初始球包 / 初始地图
→ 进入第一个节点
→ 每次节点结束后更新 RunState
→ 玩家死亡或通关后 EndRun
```

### 2.3 Run 初始化规则

```text
1. 根据角色配置生成初始球包。
2. 生成随机种子 seed。
3. chapterIndex = 1。
4. nodeIndex = 0。
5. gold = 0，除非角色配置另有定义。
6. playerHp = playerMaxHp。
7. relics 初始为空，除非角色自带初始遗物。
```

---

## 3. 战斗 BattleState

### 3.1 BattleState 定义

```ts
type BattleState = {
  battleId: string;
  encounterId: string;

  board: BoardState;

  enemy: EnemyState | BossState;

  drawPile: BallToken[];
  discardPile: BallToken[];
  exhaustPile: BallToken[];

  currentBall: BallToken | null;
  nextBalls: BallToken[];
  reserveBalls: BallToken[];

  shotCount: number;

  pressureValue: number;
  pressureMax: number;

  comboCount: number;
  battleGold: number;

  statusEffects: StatusEffect[];

  pendingEffects: Effect[];
  isBattleEnded: boolean;
  battleResult?: "WIN" | "LOSE";
};
```

### 3.2 战斗开始

```text
1. 根据 EncounterTemplate 生成敌人 / Boss。
2. 通过 BoardGenerator 生成盘面。
3. 复制 RunState.ballBag 到 drawPile。
4. 根据 battle seed 洗牌 drawPile。
5. 抽 currentBall。
6. 抽 nextBall。
7. 抽 reserveBall。
8. pressureValue = 0。
9. pressureMax = EncounterTemplate.pressureMax，默认 5。
10. shotCount = 0。
11. 触发 ON_BATTLE_START。
```

---

## 4. 球包系统 BallBag

球包是 Roguelite 构筑核心。

### 4.1 BallToken

```ts
type BallToken = {
  uid: string;
  ballId: string;

  level: number;
  modifiers: string[];

  isTemporary: boolean;
  removeAfterBattle: boolean;
  exhaustOnUse: boolean;
};
```

### 4.2 BallDefinition

```ts
type BallDefinition = {
  ballId: string;
  name: string;

  ballType: "NORMAL" | "SPECIAL" | "CURSE";
  color: "RED" | "BLUE" | "YELLOW" | "GREEN" | "PURPLE" | "NONE" | "RAINBOW";

  rarity: "COMMON" | "RARE" | "EPIC" | "BOSS";

  tags: string[];

  canMatch: boolean;
  matchRule: string;

  onHitEffects: Effect[];
  onAttachEffects: Effect[];
  onClearEffects: Effect[];
  onDropEffects: Effect[];

  exhaustOnUseDefault: boolean;
};
```

### 4.3 初始球包示例

火焰少年：

```json
{
  "characterId": "CHAR_FIRE_BOY",
  "initialBallBag": [
    { "ballId": "BALL_RED", "count": 4 },
    { "ballId": "BALL_BLUE", "count": 3 },
    { "ballId": "BALL_YELLOW", "count": 2 },
    { "ballId": "BALL_GREEN", "count": 2 },
    { "ballId": "BALL_FIRE", "count": 1 }
  ]
}
```

默认通用初始球包：

```text
红球 x3
蓝球 x3
黄球 x3
绿球 x3
炸弹球 x1
```

---

## 5. 发射球抽取规则

### 5.1 使用袋子随机

不要完全随机颜色。必须从玩家球包中抽球。

```text
战斗开始：
RunState.ballBag 复制到 drawPile
→ 洗牌
→ 抽 currentBall
→ 抽 nextBall
→ 抽 reserveBall
```

### 5.2 每次发射后的流转

```text
1. 玩家发射 currentBall。
2. currentBall 对应的 BallToken 进入 discardPile。
3. nextBalls[0] 变为 currentBall。
4. 从 drawPile 抽一颗补入 nextBalls。
5. 如果 drawPile 为空：
   discardPile 洗牌后移动到 drawPile。
```

### 5.3 备用球规则

```text
1. 每次发射前，玩家可以交换 currentBall 和 reserveBall。
2. 每次发射前最多交换 1 次。
3. 交换不消耗回合。
4. 遗物可以增加 reserveBalls 数量。
```

配置：

```json
{
  "reserveRule": {
    "reserveSlotCount": 1,
    "swapLimitPerShot": 1,
    "swapCost": 0
  }
}
```

### 5.4 抽球保底规则

必须实现轻量保底，避免连续无解。

```text
1. 如果连续 2 次发射没有消除，下一次抽球优先选择可形成消除的颜色。
2. 如果当前颜色在盘面中没有任何可匹配区域，该颜色抽取权重下降。
3. 保底不能完全覆盖球包权重，只能修正极端坏随机。
```

伪代码：

```ts
function drawNextBall(state: BattleState): BallToken {
  if (state.comboCount === 0 && state.recentMissCount >= 2) {
    return drawWeightedByPlayableColor(state.drawPile, state.board);
  }
  return drawFromPile(state.drawPile);
}
```

---

## 6. 球包添加 / 删除 / 转换

### 6.1 添加球

添加来源：

```text
1. 关卡奖励
2. 商店购买
3. 事件选择
4. 遗物触发
5. 角色技能
6. Boss 诅咒
```

添加目标：

```ts
type AddBallTarget =
  | "runBagOnly"
  | "drawTop"
  | "drawRandom"
  | "discardPile"
  | "reserve";
```

默认规则：

```text
1. 关卡结束奖励 → runBagOnly
2. 商店购买 → runBagOnly
3. 战斗内技能添加 → discardPile 或 reserve
4. Boss 诅咒球 → drawRandom
```

Effect 示例：

```json
{
  "effectType": "ADD_BALL",
  "ballId": "BALL_FIRE",
  "count": 2,
  "target": "runBagOnly",
  "temporary": false
}
```

### 6.2 删除球

删除规则：

```text
1. 只能在非战斗阶段删除永久球。
2. 默认每次删除 1 个 BallToken。
3. 不能删除临时球。
4. 删除后球包不能低于 minBagSize。
5. 删除后普通颜色种类不能低于 minNormalColorFamily。
```

默认限制：

```json
{
  "minBagSize": 10,
  "minNormalColorFamily": 2,
  "allowDeleteSpecialBall": true,
  "allowDeleteTemporaryBall": false
}
```

### 6.3 转换球

转换用于强化构筑。

示例：

```text
1. 将 1 颗红球升级为火焰球。
2. 将 1 颗蓝球升级为冰冻球。
3. 将 1 颗普通球变成彩虹球。
4. 所有黄球附加金币效果。
```

Effect 示例：

```json
{
  "effectType": "TRANSFORM_BALL",
  "fromFilter": {
    "ballType": "NORMAL",
    "color": "RED"
  },
  "toBallId": "BALL_FIRE",
  "count": 1,
  "target": "runBag"
}
```

---

## 7. MVP 球类型

必须先实现以下球：

| ballId | 名称 | 类型 | 颜色 | 规则 |
|---|---|---|---|---|
| BALL_RED | 红球 | 普通 | RED | 3 个以上同色消除 |
| BALL_BLUE | 蓝球 | 普通 | BLUE | 3 个以上同色消除 |
| BALL_YELLOW | 黄球 | 普通 | YELLOW | 3 个以上同色消除 |
| BALL_GREEN | 绿球 | 普通 | GREEN | 3 个以上同色消除 |
| BALL_BOMB | 炸弹球 | 特殊 | NONE | 命中后清除半径 1 |
| BALL_FIRE | 火焰球 | 特殊 | RED | 视为红色，命中后范围清除并施加燃烧 |
| BALL_ICE | 冰冻球 | 特殊 | BLUE | 视为蓝色，清除后压力 -1 |
| BALL_RAINBOW | 彩虹球 | 特殊 | RAINBOW | 自动匹配命中区域最优颜色 |
| BALL_PIERCE | 穿透球 | 特殊 | NONE | 穿过第一个泡泡，在第二个接触点结算 |
| BALL_CURSE_WEB | 蛛网诅咒球 | 诅咒 | NONE | 发射后随机给盘面泡泡加蛛网 |

---

## 8. 单发战斗结算顺序

必须按此顺序实现，避免触发混乱：

```text
1. 玩家选择是否交换备用球
2. 玩家发射 currentBall
3. 处理飞行、反弹、碰撞
4. 生成 BoardBubble 或触发命中效果
5. 检测同色匹配
6. 清除匹配泡泡
7. 检测悬空泡泡掉落
8. 结算伤害、金币、状态
9. 触发球效果
10. 触发盘面泡泡效果
11. 触发角色技能被动
12. 触发遗物效果
13. 推进敌人行动倒计时
14. 推进下降压力
15. 若敌人行动倒计时为 0，执行敌人 / Boss 意图
16. 若压力满，执行盘面下降
17. 检查胜负
18. 抽取下一颗球
```

---

## 9. 伤害规则

MVP 使用简单换算：

```text
清除 1 个泡泡 = 1 点基础伤害
掉落 1 个泡泡 = 1 点坠落伤害
特殊球按配置追加伤害
Boss 易伤状态下总伤害 x1.5
```

公式：

```ts
damage =
  clearedBubbleCount * clearDamageRate
  + droppedBubbleCount * dropDamageRate
  + specialDamage;
```

默认配置：

```json
{
  "clearDamageRate": 1,
  "dropDamageRate": 1,
  "bossVulnerableMultiplier": 1.5
}
```

---

## 10. 压力下降系统

### 10.1 基础压力规则

```text
1. 每发射 1 次，pressureValue +1。
2. pressureValue >= pressureMax 时触发下降。
3. 默认 pressureMax = 5。
```

### 10.2 下降结算

```text
1. 顶部新增 1 行泡泡。
2. 全体盘面下降 1 行。
3. 检查底线。
4. 底线泡泡造成压迫伤害。
5. pressureValue = 0。
```

配置：

```json
{
  "pressureMax": 5,
  "addRowOnPressureFull": true,
  "dropBoardRows": 1,
  "damageOnBottomLine": true
}
```

### 10.3 底线伤害

| 泡泡类型 | 伤害 |
|---|---:|
| 普通泡泡 | 1 |
| 石头泡泡 | 2 |
| 蛛网泡泡 | 2 |
| 毒液泡泡 | 3 |
| Boss 核心泡泡 | 5 |

---

## 11. 盘面对象 BoardBubble

### 11.1 BoardBubble

```ts
type BoardBubble = {
  uid: string;
  bubbleId: string;

  color: BubbleColor;
  bubbleType: "NORMAL" | "OBSTACLE" | "SPECIAL" | "CORE";

  row: number;
  col: number;

  hp: number;
  modifiers: string[];
  countdown: number;

  onClearEffects: Effect[];
  onDropEffects: Effect[];
  onPressureBottomEffects: Effect[];
};
```

### 11.2 盘面泡泡类型

| bubbleId | 名称 | 类型 | 规则 |
|---|---|---|---|
| BUBBLE_NORMAL_RED | 红泡泡 | 普通 | 可匹配 |
| BUBBLE_NORMAL_BLUE | 蓝泡泡 | 普通 | 可匹配 |
| BUBBLE_STONE | 石头泡泡 | 障碍 | 不能匹配，只能爆破或掉落 |
| BUBBLE_WEB | 蛛网泡泡 | 修饰 | 不会因失联掉落 |
| BUBBLE_POISON | 毒液泡泡 | 障碍 | 压到底线造成中毒 |
| BUBBLE_COIN | 金币泡泡 | 特殊 | 清除后获得金币 |
| BUBBLE_BOMB | 炸弹泡泡 | 特殊 | 清除后爆炸 |
| BUBBLE_BOSS_CORE | Boss 核心 | 核心 | 清除后 Boss 易伤 |
| BUBBLE_SPIDER_EGG | 蜘蛛卵 | 特殊 | 倒计时后变成蛛网障碍 |
| BUBBLE_LAVA | 熔岩泡泡 | 障碍 | 倒计时后爆炸 |

---

## 12. 1500 旧关卡融合规则

现有 1500 关不作为线性关卡直接使用，必须转换为：

```text
LegacyBoardTemplatePool
```

### 12.1 转换原则

旧关卡拆成三层：

```text
1. 棋盘形状：哪些格子有泡泡，哪些位置为空。
2. 颜色结构：同色团、支撑点、连锁点。
3. 机制点位：障碍、特殊球、目标球位置。
```

### 12.2 旧颜色转 ColorSlot

旧关卡颜色不直接保留。必须转成颜色槽：

```text
旧关卡：
R R B Y G
 R B B Y G
Y R S B G

转换为：
A A B C D
 A B B C D
C A ST B D
```

运行时根据玩家球包映射：

```text
A → 当前球包主色 1
B → 当前球包主色 2
C → 当前球包主色 3
D → 当前球包主色 1 或 4
```

### 12.3 ActiveColorSet

从玩家球包统计当前可用颜色：

```text
普通球颜色 + 特殊球等效颜色
```

例如：

```text
红 x5
蓝 x3
黄 x2
火焰球 x2
炸弹 x1

ActiveColorSet = 红、蓝、黄
```

### 12.4 颜色映射规则

```text
1. 普通关盘面颜色必须来自 ActiveColorSet。
2. 玩家已删除的颜色，不再作为普通主色出现。
3. Boss 可以临时生成污染色，但必须提供彩虹球、炸弹、转换或机制解法。
4. 旧关卡固定颜色只保留结构，不保留具体颜色。
```

### 12.5 LegacyBoardTemplate

```ts
type LegacyBoardTemplate = {
  templateId: string;
  legacyLevelId: number;

  rowCount: number;
  colCount: number;
  rowOffsetMode: "ODD" | "EVEN";

  grid: TemplateCell[][];

  tags: string[];
  difficultyScore: number;
  difficultyTier: number;

  colorSlotCount: number;
  obstacleBudget: number;
  specialBudget: number;

  shapeTags: string[];
  mechanicTags: string[];
  objectiveTags: string[];

  spawnRowProfile: SpawnRowProfile;
  validationInfo: ValidationInfo;
};
```

### 12.6 TemplateCell

```ts
type TemplateCell = {
  cellType: "EMPTY" | "COLOR_SLOT" | "OBSTACLE" | "SPECIAL" | "CORE";

  colorSlot?: "A" | "B" | "C" | "D" | "E" | "F";

  obstacleId?: string;
  specialId?: string;
  coreId?: string;

  weight?: number;
  tags?: string[];
};
```

### 12.7 旧关卡自动标签

离线分析 1500 关时，必须计算：

```text
rowCount
occupiedCellCount
density
originalColorCount
obstacleCount
specialCount
bottomMinDistance
connectedComponentCount
largestComponentSize
dropPotentialScore
initialMatchOpportunity
chokePointCount
deadZoneCount
```

自动标签规则：

```text
density < 0.45 → low_density
density 0.45-0.65 → mid_density
density > 0.65 → high_density

dropPotentialScore 高 → support_drop
obstacleCount 高 → obstacle_heavy
bottomMinDistance 低 → high_pressure
connectedComponentCount 高 → scattered
largestComponentSize 高 → chain_friendly
deadZoneCount 高 → rebound_required
```

### 12.8 难度评分

```text
difficultyScore =
泡泡数量 * 1.0
+ 颜色数量 * 15
+ 障碍数量 * 8
+ 底部危险度 * 10
+ 死角数量 * 6
- 特殊泡泡数量 * 5
- 掉落潜力 * 4
- 开局可消除机会 * 3
```

### 12.9 模板选择

每次进入战斗：

```text
1. 根据节点类型筛选模板。
2. 根据目标难度筛选模板。
3. 根据玩家球包颜色数筛选模板。
4. 根据敌人偏好标签筛选模板。
5. 排除最近使用过的模板。
6. 随机选择。
```

伪代码：

```ts
function selectLegacyTemplate(req: BoardGenerateRequest): LegacyBoardTemplate {
  const activeColorCount = getActiveColorCount(req.playerBallBag);

  const candidates = allTemplates.filter(t =>
    t.supportNodeType(req.nodeType)
    && Math.abs(t.difficultyScore - req.difficultyTarget) <= 25
    && t.colorSlotCount <= activeColorCount + 1
    && !hasBannedTags(t, req.bannedTags)
    && !isRecentlyUsed(t, req.recentTemplateIds)
  );

  return weightedRandom(candidates, req.seed);
}
```

### 12.10 BoardGenerateRequest

```ts
type BoardGenerateRequest = {
  seed: number;

  nodeType: "NORMAL" | "ELITE" | "BOSS" | "EVENT";
  chapterIndex: number;
  difficultyTarget: number;

  enemyId?: string;
  bossId?: string;

  playerBallBag: BallToken[];
  playerRelics: RelicInstance[];

  requiredTags: string[];
  bannedTags: string[];

  recentTemplateIds: string[];
};
```

### 12.11 BoardGenerateResult

```ts
type BoardGenerateResult = {
  boardId: string;
  sourceTemplateId: string;
  legacyLevelId: number;

  colorSlotMapping: Record<string, BubbleColor>;
  board: BoardState;

  difficultyScoreFinal: number;
  appliedOverlays: string[];

  validationPassed: boolean;
  validationWarnings: string[];
};
```

### 12.12 可玩性校验

每次生成后必须校验：

```text
1. 棋盘颜色都能被玩家球包处理。
2. 当前球 / 下颗球至少有一个可用解。
3. 至少存在 2 个有效射击选择。
4. 核心目标没有被完全堵死。
5. 底部没有离死亡线过近。
6. 障碍比例不超过当前节点预算。
7. 不存在无法清除的孤立颜色。
8. 至少存在 1 个潜在掉落点。
```

失败修正：

| 问题 | 修正 |
|---|---|
| 出现玩家没有的颜色 | 重新映射到已有颜色 |
| 初始无可消除点 | 改 1-2 个底部泡泡颜色 |
| 核心被堵死 | 移除核心周边 1 个障碍 |
| 障碍过多 | 随机移除部分障碍 |
| 底部太危险 | 整体上移或减少底部泡泡 |
| 盘面过简单 | 添加少量障碍或提高压力 |
| 盘面过难 | 添加炸弹泡泡 / 彩虹泡泡 |

---

## 13. 敌人与 Boss

### 13.1 怪物类型

怪物分为三类：

```text
普通怪
精英怪
Boss 怪
```

UI 中需要区分显示：

```text
普通怪：蓝色小图标
精英怪：紫色小图标
Boss：红色 Boss 标签
```

### 13.2 EnemyDefinition

```ts
type EnemyDefinition = {
  enemyId: string;
  name: string;

  enemyType: "NORMAL" | "ELITE" | "BOSS";

  hp: number;
  shield: number;

  intents: EnemyIntent[];
  boardOverlay: EnemyBoardOverlay;
};
```

### 13.3 普通敌人

| enemyId | 名称 | 行动 | 机制 |
|---|---|---|---|
| ENEMY_SLIME | 史莱姆 | 每 3 发攻击 | 造成 4 点伤害 |
| ENEMY_STONE_GUARD | 石像守卫 | 每 4 发添加石头 | 随机添加 2 个石头泡泡 |
| ENEMY_POISON_MUSHROOM | 毒菇 | 每 3 发污染 | 2 个泡泡变毒液 |
| ENEMY_WEB_SPIDER | 小蜘蛛 | 每 3 发织网 | 2 个泡泡加蛛网 |
| ENEMY_GHOST | 幽灵 | 每 4 发隐藏颜色 | 随机 3 个泡泡变问号状态 |

### 13.4 BossDefinition

```ts
type BossDefinition = {
  bossId: string;
  name: string;

  hp: number;
  shield: number;

  boardTemplateId: string;

  phases: BossPhase[];
  intents: BossIntent[];

  coreMechanics: BossCoreMechanic[];
  rewardPoolId: string;
};
```

### 13.5 BossPhase

```ts
type BossPhase = {
  phaseId: string;
  hpPercentFrom: number;
  hpPercentTo: number;

  pressureMaxModifier: number;
  intents: BossIntent[];
  boardSpawnRules: BoardSpawnRule[];
};
```

### 13.6 BossIntent

```ts
type BossIntent = {
  intentId: string;
  name: string;

  triggerType:
    | "SHOT_COUNT"
    | "TIME"
    | "HP_THRESHOLD"
    | "PLAYER_MISS"
    | "SPECIAL_BALL_USED";

  triggerValue: number;
  warningShotCount: number;

  effects: Effect[];
};
```

---

## 14. Boss 示例

### 14.1 蛛后

定位：

```text
第一章 Boss
核心机制：蛛网阻止泡泡掉落
克制：掉落流
弱点：爆破、火焰、精准打核心
```

机制：

```text
阶段 1：每 3 发给 2 个泡泡加蛛网。
阶段 2：每 4 发生成 1 个蜘蛛卵。
阶段 3：玩家空发时生成蛛网。
清除 Boss 核心后，Boss 易伤 3 发，受到伤害 x1.5。
```

### 14.2 熔岩巨兽

定位：

```text
第二章 Boss
核心机制：高压下降 + 熔岩泡泡倒计时
```

机制：

```text
阶段 1：每 4 发生成 1 个熔岩泡泡。
阶段 2：每 3 发生成 2 个熔岩泡泡。
阶段 3：pressureMax -1，下降更快。
熔岩泡泡 3 发后爆炸，伤害玩家并清除周围泡泡。
```

### 14.3 镜像法师

定位：

```text
克制特殊球爆发流。
```

机制：

```text
玩家每使用 1 颗特殊球，Boss 获得 1 层镜像能量。
镜像能量达到 3 层，生成镜像泡泡。
镜像泡泡存在时，玩家特殊球伤害 -30%。
清除镜像泡泡后，Boss 易伤 2 发。
```

### 14.4 混沌核心

定位：

```text
后期 Boss，克制精简球包流。
```

机制：

```text
每 4 发污染一片区域。
每阶段给玩家球包临时加入混沌球。
混沌球可以匹配任意颜色，但会 pressureValue +1。
清除混沌核心后，污染恢复。
```

---

## 15. 遗物系统 Relic

### 15.1 RelicDefinition

```ts
type RelicDefinition = {
  relicId: string;
  name: string;

  rarity: "COMMON" | "RARE" | "EPIC" | "BOSS";
  tags: string[];

  trigger: TriggerType;
  condition: Condition[];
  effects: Effect[];

  stackRule: "UNIQUE" | "STACKABLE" | "UPGRADE";
};
```

### 15.2 TriggerType

```ts
type TriggerType =
  | "ON_BATTLE_START"
  | "ON_SHOT_START"
  | "ON_BALL_FIRED"
  | "ON_BALL_ATTACH"
  | "ON_MATCH_CLEAR"
  | "ON_BUBBLE_DROP"
  | "ON_MISS"
  | "ON_PRESSURE_INCREASE"
  | "ON_PRESSURE_FULL"
  | "ON_ENEMY_INTENT"
  | "ON_BATTLE_END"
  | "ON_REWARD_GENERATE";
```

### 15.3 MVP 遗物

| relicId | 名称 | 稀有度 | 触发 | 效果 |
|---|---|---|---|---|
| RELIC_BURN_CORE | 爆燃核心 | RARE | 清除红色 | 随机把相邻 1 个泡泡变红 |
| RELIC_GRAVITY_HOOK | 重力钩爪 | COMMON | 泡泡掉落 | 每掉落 1 个泡泡，额外造成 1 点伤害 |
| RELIC_ICE_CLOCK | 冰霜怀表 | RARE | 清除蓝色 | 下降压力 -1 |
| RELIC_PRISM | 彩虹棱镜 | RARE | 每 6 发 | 当前球变成彩虹球 |
| RELIC_SPARE_BARREL | 备用弹仓 | COMMON | 获得时 | 备用球槽 +1 |
| RELIC_POWDER_BAG | 火药袋 | RARE | 炸弹触发 | 炸弹范围 +1，但每关开局增加 1 个石头 |
| RELIC_GREED_COIN | 赌徒金币 | COMMON | 正好清除 3 个泡泡 | 获得 2 金币 |
| RELIC_MIRROR_WALL | 镜面墙 | RARE | 反弹 2 次以上命中 | 伤害 +50% |
| RELIC_COMPRESSION | 压缩器 | EPIC | 球包 <= 12 | 特殊球伤害 +30% |
| RELIC_CURSE_CROWN | 诅咒王冠 | EPIC | 奖励生成 | 奖励品质提高，但每关开局多 2 个障碍 |
| RELIC_WEB_CUTTER | 断网刀 | COMMON | 清除蛛网 | 获得 1 点护盾 |
| RELIC_LAVA_HEART | 熔火之心 | BOSS | 清除燃烧泡泡 | 对 Boss 额外 2 点伤害 |

---

## 16. 角色与技能

### 16.1 CharacterDefinition

```ts
type CharacterDefinition = {
  characterId: string;
  name: string;

  maxHp: number;
  initialGold: number;

  initialBallBag: BallEntry[];

  passiveSkill: SkillDefinition;
  activeSkill: SkillDefinition;
};
```

### 16.2 SkillDefinition

```ts
type SkillDefinition = {
  skillId: string;
  name: string;
  skillType: "PASSIVE" | "ACTIVE";

  chargeRule: ChargeRule;
  cost: number;

  trigger: TriggerType;
  effects: Effect[];
};
```

### 16.3 角色示例：火焰少年

```text
定位：红色燃烧流
初始球包：红色更多，带火焰球
被动：清除红色泡泡时给敌人施加燃烧
主动：将当前球变成火焰球
```

技能：

```json
{
  "skillId": "SKILL_FIRE_ACTIVE",
  "name": "装填火焰",
  "skillType": "ACTIVE",
  "cost": 6,
  "chargeRule": {
    "type": "ON_CLEAR_BUBBLE",
    "chargePerBubble": 1
  },
  "effects": [
    {
      "effectType": "TRANSFORM_CURRENT_BALL",
      "toBallId": "BALL_FIRE"
    }
  ]
}
```

---

## 17. 奖励系统

### 17.1 RewardType

```ts
type RewardType =
  | "ADD_BALL"
  | "REMOVE_BALL"
  | "TRANSFORM_BALL"
  | "ADD_RELIC"
  | "GOLD"
  | "HEAL"
  | "MAX_HP"
  | "REROLL_REWARD";
```

### 17.2 关卡结束流程

普通战胜利：

```text
1. 结算敌人死亡。
2. 触发 ON_BATTLE_END。
3. 获得基础金币。
4. 移除 removeAfterBattle 的临时球。
5. 展示三选一奖励。
6. 玩家选择 1 个奖励。
7. 更新 RunState。
8. 进入地图选择。
```

精英战胜利：

```text
1. 获得金币。
2. 必得 1 个遗物。
3. 额外展示 1 次球包奖励三选一。
4. 地图继续。
```

Boss 胜利：

```text
1. 获得 Boss 遗物。
2. 获得章节宝箱。
3. 回复 30% 最大生命。
4. 清除部分临时诅咒。
5. 进入下一章节。
```

### 17.3 三选一奖励生成

```text
1. 根据节点类型生成奖励池。
2. 根据章节决定稀有度权重。
3. 根据玩家当前 Build 添加轻微权重。
4. 排除无法生效的奖励。
5. 生成 3 个不同奖励。
```

稀有度权重：

```json
{
  "normalBattle": {
    "COMMON": 70,
    "RARE": 25,
    "EPIC": 5
  },
  "eliteBattle": {
    "COMMON": 40,
    "RARE": 45,
    "EPIC": 15
  },
  "bossBattle": {
    "RARE": 60,
    "EPIC": 30,
    "BOSS": 10
  }
}
```

---

## 18. 商店和事件

### 18.1 商店商品

| 商品 | 价格 |
|---|---:|
| 添加普通球 x2 | 12 |
| 添加特殊球 x1 | 18 |
| 删除 1 颗球 | 20 |
| 回复 6 点 HP | 15 |
| 普通遗物 | 35 |
| 稀有遗物 | 55 |
| 刷新商店 | 8 |

### 18.2 事件示例：破损调色盘

```json
{
  "eventId": "EVENT_BROKEN_PALETTE",
  "title": "破损调色盘",
  "description": "一个古老调色盘还能改变你的弹仓，但代价是生命。",
  "choices": [
    {
      "choiceId": "REMOVE_COLOR",
      "text": "失去 3 点生命，删除 1 颗普通球",
      "effects": [
        { "effectType": "DAMAGE_PLAYER", "value": 3 },
        {
          "effectType": "OPEN_REMOVE_BALL_UI",
          "count": 1,
          "filter": { "ballType": "NORMAL" }
        }
      ]
    },
    {
      "choiceId": "GAIN_GOLD",
      "text": "获得 15 金币",
      "effects": [
        { "effectType": "ADD_GOLD", "value": 15 }
      ]
    },
    {
      "choiceId": "LEAVE",
      "text": "离开",
      "effects": []
    }
  ]
}
```

---

## 19. Effect 系统

所有球、技能、遗物、Boss 行动都走统一 EffectResolver。

### 19.1 EffectType

```ts
type EffectType =
  | "DAMAGE_ENEMY"
  | "DAMAGE_PLAYER"
  | "HEAL_PLAYER"
  | "ADD_GOLD"

  | "ADD_BALL"
  | "REMOVE_BALL"
  | "TRANSFORM_BALL"
  | "EXHAUST_BALL"

  | "CLEAR_RADIUS"
  | "CLEAR_COLOR"
  | "TRANSFORM_BOARD_BUBBLE"
  | "SPAWN_BOARD_BUBBLE"
  | "ADD_BOARD_MODIFIER"
  | "REMOVE_BOARD_MODIFIER"

  | "MODIFY_PRESSURE"
  | "RESET_PRESSURE"
  | "ADD_STATUS_TO_ENEMY"
  | "ADD_STATUS_TO_PLAYER"

  | "ADD_RELIC"
  | "MODIFY_REWARD_RARITY"
  | "OPEN_REMOVE_BALL_UI"
  | "TRANSFORM_CURRENT_BALL";
```

### 19.2 触发优先级

```text
1. 球本身效果
2. 盘面泡泡效果
3. 角色技能效果
4. 遗物效果
5. 敌人 / Boss 反应
6. 压力系统
7. 胜负检查
```

### 19.3 连锁保护

```text
单次发射最大连锁深度：20。
超过后停止继续触发，并记录日志。
```

---

## 20. UI 数据绑定规则

本节描述最终 UI 结构，不涉及具体美术资源切图。

### 20.1 顶部 Boss 区

顶部使用一个整合卡片，不再拆成多个零散面板。

显示内容：

```text
1. 怪物类型标签：普通怪 / 精英怪 / Boss
2. 怪物头像，Boss 显示更大
3. 怪物名称
4. HP 条：当前 HP / 最大 HP
5. 护盾数值
6. 意图：例如“冰锥冲击，3 回合后发动”
7. 回合数
8. 分数
9. 压力 2 / 5
```

### 20.2 步数位置

最终 UI 中“步数 28”从 Boss 区移动至下方操作台中央。

```text
操作台中央：
步数
28
发射器
```

### 20.3 设置按钮

```text
设置按钮放到右上角。
暂停按钮删除。
```

### 20.4 战斗棋盘

```text
1. 棋盘居中显示。
2. 不被顶部 UI 挤压。
3. 顶部显示当前目标计数条，例如：骷髅 3 / 紫泡 2 / 蓝泡 3。
4. 棋盘下方显示“下降压力”警戒线。
```

### 20.5 操作台

```text
1. 当前球：左侧。
2. 发射器：中间。
3. 下一球：右侧。
4. 备用球：右侧竖栏。
5. 步数：发射器下方或中间圆形信息位。
```

### 20.6 UI ViewModel

```ts
type BattleHUDViewModel = {
  monsterType: "NORMAL" | "ELITE" | "BOSS";
  monsterName: string;
  monsterHp: number;
  monsterMaxHp: number;
  monsterShield: number;
  monsterIntentName: string;
  monsterIntentCountdown: number;

  round: number;
  score: number;
  pressureValue: number;
  pressureMax: number;

  steps: number;

  currentBallId: string;
  nextBallId: string;
  reserveBallIds: string[];

  objectiveCounters: ObjectiveCounter[];
};
```

---

## 21. 节点地图流程

### 21.1 NodeType

```ts
type NodeType =
  | "NORMAL_BATTLE"
  | "ELITE_BATTLE"
  | "BOSS_BATTLE"
  | "SHOP"
  | "EVENT"
  | "REST"
  | "TREASURE";
```

### 21.2 MVP 章节结构

```text
普通战
→ 普通战 / 事件 二选一
→ 精英战 / 商店 二选一
→ 普通战
→ 休息点
→ Boss
```

### 21.3 REST 休息点

提供三选一：

```text
1. 回复 30% 最大生命。
2. 删除 1 颗球。
3. 升级 1 颗球。
```

---

## 22. 存档与结算

### 22.1 Run 内存存档

每完成一个节点后保存：

```text
RunState
MapState
BallBag
Relics
Gold
HP
chapterIndex
nodeIndex
recentTemplateIds
```

### 22.2 本局失败结算

```text
1. RunState 结束。
2. 结算局外货币或经验。
3. 记录最高章节、Boss 击败情况、解锁条件。
4. 清除临时球、临时诅咒、临时状态。
```

---

## 23. 开发实施顺序

Codex 按以下顺序实现，不要同时改太多系统。

### 阶段 1：基础框架

```text
1. RunState
2. BattleState
3. BallToken / BallDefinition
4. BallBagManager
5. 当前球 / 下一球 / 备用球
```

验收：

```text
可以用球包抽球并发射。
发射后球进入 discardPile。
drawPile 为空时 discardPile 洗回 drawPile。
```

### 阶段 2：战斗结算

```text
1. 单发结算流程
2. 消除数量转伤害
3. 掉落数量转伤害
4. pressureValue 增加
5. pressure 满后下降
```

验收：

```text
清除泡泡能对敌人造成伤害。
压力满时新增行并下降。
底线泡泡能扣玩家血。
```

### 阶段 3：旧关卡模板池

```text
1. LegacyBoardImporter
2. ColorSlotMapper
3. BoardGenerator
4. BoardValidator
```

验收：

```text
能从旧关卡生成当前球包可玩的盘面。
已删除颜色不会大量出现在普通盘面。
```

### 阶段 4：敌人与 Boss

```text
1. EnemySystem
2. BossSystem
3. BossPhase
4. BossIntent
5. BoardOverlay
```

验收：

```text
蛛后每 3 发加蛛网。
Boss 血量进入不同阶段后行为变化。
```

### 阶段 5：遗物与技能

```text
1. EffectResolver
2. GameEvent
3. RelicSystem
4. SkillSystem
```

验收：

```text
清除红泡泡可以触发爆燃核心。
掉落泡泡可以触发重力钩爪。
主动技能可以改变当前球。
```

### 阶段 6：奖励 / 商店 / 事件

```text
1. RewardSystem
2. 三选一奖励
3. 添加球 / 删除球 / 转换球
4. ShopSystem
5. EventSystem
```

验收：

```text
普通战结束后出现三选一。
选择添加火焰球后下一场战斗球包变化。
商店可删除球。
```

### 阶段 7：UI 绑定

```text
1. BattleHUDViewModel
2. BossPanelViewModel
3. BallTrayViewModel
4. BoardViewModel
```

验收：

```text
顶部 Boss 卡片显示 HP、护盾、意图、回合、分数、压力。
下方操作台显示当前球、下一球、备用球、步数。
设置按钮右上角，暂停按钮不显示。
```

---

## 24. 验收用测试场景

### 24.1 球包测试

```text
初始球包：
红 x2，蓝 x2，炸弹 x1

连续抽 5 次必须抽完全部球。
第 6 次从洗牌后的 discardPile 抽。
```

### 24.2 删除球测试

```text
球包数量 = 10 时，不允许删除。
普通颜色只有 2 种时，不允许删除其中一种到 0。
```

### 24.3 压力测试

```text
pressureMax = 5。
发射 5 次后必须新增一行并下降。
pressureValue 重置为 0。
```

### 24.4 Boss 阶段测试

```text
蛛后 HP 120。
降到 79 以下进入阶段 2。
降到 39 以下进入阶段 3。
阶段 3 玩家空发时生成蛛网。
```

### 24.5 旧关卡颜色映射测试

```text
旧关卡有 A/B/C/D。
玩家只有红/蓝/黄。
生成后不能出现绿色或紫色普通泡泡。
D 必须映射到红/蓝/黄之一。
```

### 24.6 UI 测试

```text
步数显示在底部发射器区域。
顶部不再出现独立步数卡。
设置按钮在右上角。
暂停按钮不可见。
```

---

## 25. 禁止项

实现时禁止以下做法：

```text
1. 不要使用完全随机发射球。
2. 不要让旧关卡固定颜色直接进入 Roguelite 盘面。
3. 不要让玩家已删除颜色继续大量出现在普通关。
4. 不要让 Boss 只是血量更高。
5. 不要一碰底线就强制失败，MVP 用扣血机制。
6. 不要让遗物绕过 EffectResolver 单独写死。
7. 不要让 UI 直接读取复杂战斗状态，必须通过 ViewModel。
8. 不要把局内金币和局外钻石混用。
9. 不要让战斗中无限付费复活或无限买道具。
```

---

## 26. 最小可上线 MVP 内容清单

```text
角色：1 个
普通球：4 种
特殊球：4 种
诅咒球：1 种
遗物：12 个
普通敌人：4 个
Boss：2 个
节点类型：普通战、精英战、商店、事件、休息点、Boss
旧关卡模板：先接入 100-300 个经过自动校验的模板
UI：顶部 Boss 整合卡、中央棋盘、底部操作台、右侧备用球
```

---

## 27. 最终设计原则

```text
盘面泡泡服务关卡主题。
发射泡泡服务球包构筑。
新增泡泡服务敌人压力。
遗物改变规则，不只加数值。
Boss 通过阶段和机制检验 Build。
旧关卡提供结构资产，不提供固定解法。
```

一句话目标：

```text
单发是泡泡射手，单局是 Roguelite 构筑。
```
