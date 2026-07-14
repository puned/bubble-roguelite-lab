# 泡泡射手 Roguelite 第一章 10 关刷球规则细化 V0.2

> 目标：把“每关球如何刷出”拆成程序可执行规则，覆盖棋盘泡泡、发射球、临时球、压力新增行、敌人 Overlay、保底与校验。

## 1. 全局原则


### 1.1 三类“刷球”
1. **棋盘泡泡刷出**：战斗开始时由旧关卡模板 + ColorSlot 映射 + 敌人 Overlay 生成。
2. **发射球刷出**：玩家当前球、下一球、备用球从 `RunState.ballBag` 复制出的 `drawPile` 中抽取。
3. **战斗中新泡泡刷出**：由压力下降新增行、敌人行动、Boss 阶段机制生成。

### 1.2 发射球不纯随机
发射球使用 `BAG_RANDOM`：
```text
battleStart:
  drawPile = shuffle(copy(RunState.ballBag))
  currentBall = draw(drawPile)
  nextBall = draw(drawPile)
  reserveBall = draw(drawPile)

afterShot:
  firedBall -> discardPile
  currentBall = nextBall
  nextBall = draw(drawPile)
  if drawPile empty:
      drawPile = shuffle(discardPile)
      discardPile = []
```

### 1.3 临时注入球
关卡中为了教学或公平性注入的球必须满足：
```json
{
  "isTemporary": true,
  "removeAfterBattle": true
}
```
临时球不进入永久球包，不影响玩家长期构筑。

### 1.4 删除颜色兼容
玩家通过奖励/商店/事件删除的颜色，后续普通关不再大量刷出该颜色。旧关卡颜色必须先转成 `ColorSlot`，再映射到玩家当前 `ActiveColorSet`。

## 2. 每关刷球规则表

### 第 1 关：林地入口·史莱姆（NORMAL）

- **主题**：基础三色与发射节奏教学
- **敌人/Boss**：`ENEMY_SLIME`
- **难度区间**：45-65
- **模板标签**：`standard, low_density, chain_friendly`
- **颜色槽数量**：3
- **压力上限**：6

**棋盘泡泡生成**  
三色低密度；普通泡泡 90%；金币泡泡 1；炸弹泡泡 0-1；无初始障碍；至少 2 个底部可消点。

**发射球生成**  
BAG_RANDOM + 强开局保护。前 3 发从可消颜色中抽取；current/next/reserve 至少 1 个可消。连续 2 空发后下一球强制可消。

**临时注入球**  
无；若玩家初始球包缺少特殊球，不补，保持基础体验。

**下降新增行**  
新增行密度 70%；障碍 0%；特殊 2%；颜色只从 ActiveColorSet 取。

**敌人/机制刷泡泡**  
史莱姆每 3 发攻击，不生成棋盘泡泡。

**保底规则**  
miss>=2: nextBall = 可形成 3 连的颜色；每场不限次。

**奖励对刷球影响**  
奖励偏向：添加普通色球、添加火焰球、少量金币；不出现删除球，避免过早破坏理解。

**生成校验**  
开局必须有 2 个可消点；底部距死亡线 >= 4 行。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_01",
  "levelNo": 1,
  "nodeType": "NORMAL",
  "displayName": "林地入口·史莱姆",
  "enemyId": "ENEMY_SLIME",
  "difficultyRange": "45-65",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "standard",
      "low_density",
      "chain_friendly"
    ],
    "colorSlotCount": 3,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "三色低密度；普通泡泡 90%；金币泡泡 1；炸弹泡泡 0-1；无初始障碍；至少 2 个底部可消点。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "开局必须有 2 个可消点；底部距死亡线 >= 4 行。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 强开局保护。前 3 发从可消颜色中抽取；current/next/reserve 至少 1 个可消。连续 2 空发后下一球强制可消。",
    "temporaryInjection": "无；若玩家初始球包缺少特殊球，不补，保持基础体验。",
    "antiStall": "miss>=2: nextBall = 可形成 3 连的颜色；每场不限次。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 6,
    "rowRule": "新增行密度 70%；障碍 0%；特殊 2%；颜色只从 ActiveColorSet 取。"
  },
  "enemyOverlay": {
    "ruleSummary": "史莱姆每 3 发攻击，不生成棋盘泡泡。"
  },
  "rewardBias": "奖励偏向：添加普通色球、添加火焰球、少量金币；不出现删除球，避免过早破坏理解。"
}
```
</details>

### 第 2 关：藤蔓桥·支撑点（NORMAL）

- **主题**：学习打支撑点与掉落伤害
- **敌人/Boss**：`ENEMY_SLIME_BIG`
- **难度区间**：60-85
- **模板标签**：`support_drop, mid_density, no_obstacle`
- **颜色槽数量**：3
- **压力上限**：6

**棋盘泡泡生成**  
三色中密度；保留上方 2-3 个支撑点；下方挂载区域 8-14 个泡泡；金币泡泡 1-2；彩虹泡泡 0-1。

**发射球生成**  
BAG_RANDOM + 掉落教学保护。前 4 发至少 1 发可命中支撑点颜色；reserve 优先放置支撑点相关颜色。

**临时注入球**  
如果玩家球包没有彩虹/炸弹/火焰，则在 drawPile 第 5-7 位临时插入 BALL_RAINBOW x1。

**下降新增行**  
新增行密度 75%；维持支撑点风格；特殊 2%；不刷障碍。

**敌人/机制刷泡泡**  
大型史莱姆每 4 发攻击并给 1 个随机普通泡泡加黏液标记；黏液可普通匹配。

**保底规则**  
miss>=2: nextBall 优先选择能打掉支撑点或形成普通消除的颜色。

**奖励对刷球影响**  
奖励偏向：重力钩爪、添加炸弹球、删除 1 颗非核心普通球开始低概率出现。

**生成校验**  
至少 1 个单发可制造掉落的潜在路径；彩虹泡泡不可直接贴底。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_02",
  "levelNo": 2,
  "nodeType": "NORMAL",
  "displayName": "藤蔓桥·支撑点",
  "enemyId": "ENEMY_SLIME_BIG",
  "difficultyRange": "60-85",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "support_drop",
      "mid_density",
      "no_obstacle"
    ],
    "colorSlotCount": 3,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "三色中密度；保留上方 2-3 个支撑点；下方挂载区域 8-14 个泡泡；金币泡泡 1-2；彩虹泡泡 0-1。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "至少 1 个单发可制造掉落的潜在路径；彩虹泡泡不可直接贴底。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 掉落教学保护。前 4 发至少 1 发可命中支撑点颜色；reserve 优先放置支撑点相关颜色。",
    "temporaryInjection": "如果玩家球包没有彩虹/炸弹/火焰，则在 drawPile 第 5-7 位临时插入 BALL_RAINBOW x1。",
    "antiStall": "miss>=2: nextBall 优先选择能打掉支撑点或形成普通消除的颜色。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 6,
    "rowRule": "新增行密度 75%；维持支撑点风格；特殊 2%；不刷障碍。"
  },
  "enemyOverlay": {
    "ruleSummary": "大型史莱姆每 4 发攻击并给 1 个随机普通泡泡加黏液标记；黏液可普通匹配。"
  },
  "rewardBias": "奖励偏向：重力钩爪、添加炸弹球、删除 1 颗非核心普通球开始低概率出现。"
}
```
</details>

### 第 3 关：碎石坡·石头障碍（NORMAL）

- **主题**：障碍与爆破球教学
- **敌人/Boss**：`ENEMY_STONE_GUARD_LIGHT`
- **难度区间**：75-105
- **模板标签**：`standard, stone_light, mid_density`
- **颜色槽数量**：3-4
- **压力上限**：5

**棋盘泡泡生成**  
普通泡泡 78%-84%；石头泡泡 3-5 个，优先中层，不堵底部；炸弹泡泡 1；金币泡泡 1。

**发射球生成**  
BAG_RANDOM + 解障保底。若玩家球包有炸弹/火焰，前 5 发至少出现 1 个；若没有，则临时注入 BALL_BOMB x1 到 drawTopWithin5。

**临时注入球**  
BALL_BOMB x1，条件：RunState.ballBag 中无 tags=[bomb, fire, pierce, rainbow]。

**下降新增行**  
新增行密度 78%；石头概率 5%；特殊 2%。

**敌人/机制刷泡泡**  
轻型石像每 4 发在中上层添加石头 x1；不能添加到 critical_path。

**保底规则**  
miss>=2 且石头数量>=4 时，下一球优先炸弹/火焰/可消颜色；临时炸弹每场最多 1 次。

**奖励对刷球影响**  
奖励偏向：炸弹球、火焰球、红球升级、删除普通球。

**生成校验**  
石头比例 <= 10%；核心路径不存在；至少 2 个非障碍消除选择。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_03",
  "levelNo": 3,
  "nodeType": "NORMAL",
  "displayName": "碎石坡·石头障碍",
  "enemyId": "ENEMY_STONE_GUARD_LIGHT",
  "difficultyRange": "75-105",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "standard",
      "stone_light",
      "mid_density"
    ],
    "colorSlotCount": "3-4",
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "普通泡泡 78%-84%；石头泡泡 3-5 个，优先中层，不堵底部；炸弹泡泡 1；金币泡泡 1。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "石头比例 <= 10%；核心路径不存在；至少 2 个非障碍消除选择。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 解障保底。若玩家球包有炸弹/火焰，前 5 发至少出现 1 个；若没有，则临时注入 BALL_BOMB x1 到 drawTopWithin5。",
    "temporaryInjection": "BALL_BOMB x1，条件：RunState.ballBag 中无 tags=[bomb, fire, pierce, rainbow]。",
    "antiStall": "miss>=2 且石头数量>=4 时，下一球优先炸弹/火焰/可消颜色；临时炸弹每场最多 1 次。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 5,
    "rowRule": "新增行密度 78%；石头概率 5%；特殊 2%。"
  },
  "enemyOverlay": {
    "ruleSummary": "轻型石像每 4 发在中上层添加石头 x1；不能添加到 critical_path。"
  },
  "rewardBias": "奖励偏向：炸弹球、火焰球、红球升级、删除普通球。"
}
```
</details>

### 第 4 关：毒菇洼地·污染（NORMAL）

- **主题**：敌人动态刷泡泡与优先级选择
- **敌人/Boss**：`ENEMY_POISON_MUSHROOM`
- **难度区间**：90-125
- **模板标签**：`mid_density, support_drop, poison_safe`
- **颜色槽数量**：4
- **压力上限**：5

**棋盘泡泡生成**  
四色；初始毒液泡泡 2 个，放中层安全区；炸弹泡泡 1；金币泡泡 1；毒液不能贴底、不能堵唯一支撑点。

**发射球生成**  
BAG_RANDOM + 污染反制。当前毒液>=4 或毒液倒计时<=1 时，next/reserve 优先给可清毒路径颜色或特殊球。

**临时注入球**  
如果玩家无任何清障特殊球，drawPile 第 4-8 位临时插入 BALL_FIRE x1 或 BALL_BOMB x1。

**下降新增行**  
新增行密度 80%；毒液概率 4%；无石头；特殊 2%。

**敌人/机制刷泡泡**  
毒菇每 3 发污染普通泡泡 x2，优先已有毒液邻接，但避开底部最后一行和唯一通路。

**保底规则**  
miss>=2: nextBall 可消；poisonCount>=5: reserve 变为可清毒颜色，冷却 4 发。

**奖励对刷球影响**  
奖励偏向：冰冻球、火焰球、净化类遗物、回复生命。

**生成校验**  
毒液初始数量 <=2；第 1 发必须有非毒区域可消点；污染不会生成无解孤岛。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_04",
  "levelNo": 4,
  "nodeType": "NORMAL",
  "displayName": "毒菇洼地·污染",
  "enemyId": "ENEMY_POISON_MUSHROOM",
  "difficultyRange": "90-125",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "mid_density",
      "support_drop",
      "poison_safe"
    ],
    "colorSlotCount": 4,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "四色；初始毒液泡泡 2 个，放中层安全区；炸弹泡泡 1；金币泡泡 1；毒液不能贴底、不能堵唯一支撑点。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "毒液初始数量 <=2；第 1 发必须有非毒区域可消点；污染不会生成无解孤岛。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 污染反制。当前毒液>=4 或毒液倒计时<=1 时，next/reserve 优先给可清毒路径颜色或特殊球。",
    "temporaryInjection": "如果玩家无任何清障特殊球，drawPile 第 4-8 位临时插入 BALL_FIRE x1 或 BALL_BOMB x1。",
    "antiStall": "miss>=2: nextBall 可消；poisonCount>=5: reserve 变为可清毒颜色，冷却 4 发。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 5,
    "rowRule": "新增行密度 80%；毒液概率 4%；无石头；特殊 2%。"
  },
  "enemyOverlay": {
    "ruleSummary": "毒菇每 3 发污染普通泡泡 x2，优先已有毒液邻接，但避开底部最后一行和唯一通路。"
  },
  "rewardBias": "奖励偏向：冰冻球、火焰球、净化类遗物、回复生命。"
}
```
</details>

### 第 5 关：蛛网石像·精英（ELITE）

- **主题**：蛛网阻止掉落 + 石头阻断连锁
- **敌人/Boss**：`ELITE_WEB_STONE_GUARD`
- **难度区间**：130-170
- **模板标签**：`elite_candidate, mid_density, obstacle_medium`
- **颜色槽数量**：4
- **压力上限**：4

**棋盘泡泡生成**  
四色；初始石头 4-6；蛛网修饰 3-4；炸弹泡泡 1；弱点泡泡 1；蛛网不掉落，石头只爆破/掉落。

**发射球生成**  
BAG_RANDOM + 精英弱保底。前 2 发至少 1 个可消；前 6 发至少出现 1 个解障球。之后只保留 miss>=2 保底。

**临时注入球**  
若玩家球包无解障特殊球，临时注入 BALL_BOMB x1 到 drawTopWithin6；若已有则不注入。

**下降新增行**  
新增行密度 82%；蛛网概率 8%；石头概率 5%；特殊 1%。

**敌人/机制刷泡泡**  
每 3 发随机 2 个泡泡加蛛网；每 5 发添加石头 x1；不会作用于底部最后一行。

**保底规则**  
miss>=2: nextBall 可消；但不会强制给特殊球，保持精英压力。

**奖励对刷球影响**  
胜利必给遗物；额外三选一偏向：爆破、掉落、删球。

**生成校验**  
蛛网+石头总占比 <= 18%；弱点泡泡在 4-8 发内理论可达。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_05",
  "levelNo": 5,
  "nodeType": "ELITE",
  "displayName": "蛛网石像·精英",
  "enemyId": "ELITE_WEB_STONE_GUARD",
  "difficultyRange": "130-170",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "elite_candidate",
      "mid_density",
      "obstacle_medium"
    ],
    "colorSlotCount": 4,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "四色；初始石头 4-6；蛛网修饰 3-4；炸弹泡泡 1；弱点泡泡 1；蛛网不掉落，石头只爆破/掉落。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "蛛网+石头总占比 <= 18%；弱点泡泡在 4-8 发内理论可达。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 精英弱保底。前 2 发至少 1 个可消；前 6 发至少出现 1 个解障球。之后只保留 miss>=2 保底。",
    "temporaryInjection": "若玩家球包无解障特殊球，临时注入 BALL_BOMB x1 到 drawTopWithin6；若已有则不注入。",
    "antiStall": "miss>=2: nextBall 可消；但不会强制给特殊球，保持精英压力。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 4,
    "rowRule": "新增行密度 82%；蛛网概率 8%；石头概率 5%；特殊 1%。"
  },
  "enemyOverlay": {
    "ruleSummary": "每 3 发随机 2 个泡泡加蛛网；每 5 发添加石头 x1；不会作用于底部最后一行。"
  },
  "rewardBias": "胜利必给遗物；额外三选一偏向：爆破、掉落、删球。"
}
```
</details>

### 第 6 关：冰晶溪谷·减压（NORMAL）

- **主题**：下降压力与冰冻/蓝色收益
- **敌人/Boss**：`ENEMY_ICE_SPRITE`
- **难度区间**：110-140
- **模板标签**：`mid_density, pressure_training, blue_friendly`
- **颜色槽数量**：4
- **压力上限**：5

**棋盘泡泡生成**  
四色；冰冻泡泡 2-3；蓝色槽位权重 +5%；充能泡泡 1；底部压力略高但不贴死线。

**发射球生成**  
BAG_RANDOM + 高压修正。当 pressure>=4 时，如果 ActiveColorSet 有蓝色，nextBall 蓝色权重 +25%；否则优先可消颜色。

**临时注入球**  
如果玩家无蓝色且无冰冻球，不强行刷蓝；改为临时 BALL_RAINBOW x1 进 discardPile。

**下降新增行**  
新增行密度 82%；冰冻概率 5%；障碍 0-3%；特殊 2%。

**敌人/机制刷泡泡**  
冰灵每 4 发冻结 2 个底部以外泡泡；被冻结泡泡需命中或相邻消除解除。

**保底规则**  
miss>=2: nextBall 可消；pressure>=4 时 reserve 优先减压颜色/冰冻球。

**奖励对刷球影响**  
奖励偏向：冰霜怀表、冰冻球、备用弹仓。

**生成校验**  
pressure 开局为 0；底部距死亡线 >=3；冰冻不能锁死全部可消点。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_06",
  "levelNo": 6,
  "nodeType": "NORMAL",
  "displayName": "冰晶溪谷·减压",
  "enemyId": "ENEMY_ICE_SPRITE",
  "difficultyRange": "110-140",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "mid_density",
      "pressure_training",
      "blue_friendly"
    ],
    "colorSlotCount": 4,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "四色；冰冻泡泡 2-3；蓝色槽位权重 +5%；充能泡泡 1；底部压力略高但不贴死线。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "pressure 开局为 0；底部距死亡线 >=3；冰冻不能锁死全部可消点。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 高压修正。当 pressure>=4 时，如果 ActiveColorSet 有蓝色，nextBall 蓝色权重 +25%；否则优先可消颜色。",
    "temporaryInjection": "如果玩家无蓝色且无冰冻球，不强行刷蓝；改为临时 BALL_RAINBOW x1 进 discardPile。",
    "antiStall": "miss>=2: nextBall 可消；pressure>=4 时 reserve 优先减压颜色/冰冻球。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 5,
    "rowRule": "新增行密度 82%；冰冻概率 5%；障碍 0-3%；特殊 2%。"
  },
  "enemyOverlay": {
    "ruleSummary": "冰灵每 4 发冻结 2 个底部以外泡泡；被冻结泡泡需命中或相邻消除解除。"
  },
  "rewardBias": "奖励偏向：冰霜怀表、冰冻球、备用弹仓。"
}
```
</details>

### 第 7 关：回声山壁·反弹宝箱（NORMAL）

- **主题**：反弹角度、侧边奖励、贪婪选择
- **敌人/Boss**：`ENEMY_BAT_TRICKSTER`
- **难度区间**：115-150
- **模板标签**：`rebound_required, treasure_side, mid_density`
- **颜色槽数量**：4
- **压力上限**：5

**棋盘泡泡生成**  
四色；左右侧道；宝箱泡泡 1，倒计时 6 发；彩虹泡泡 1；弱点泡泡 1 放高处或侧面。

**发射球生成**  
BAG_RANDOM + 反弹辅助。reserve 优先给能命中侧边宝箱/弱点路径的颜色；前 6 发不保证拿宝箱，只保证至少 1 条可达路径。

**临时注入球**  
若玩家无穿透/彩虹/炸弹，临时 BALL_RAINBOW x1 放 reserve，玩家可选择是否使用。

**下降新增行**  
新增行密度 78%；障碍 2%；特殊 3%；不新增宝箱。

**敌人/机制刷泡泡**  
蝙蝠每 4 发隐藏 2 个泡泡颜色，持续 2 发；不隐藏宝箱和弱点。

**保底规则**  
miss>=2: nextBall 可消；宝箱倒计时<=2 时不强行喂球，只提示风险。

**奖励对刷球影响**  
奖励偏向：镜面墙、彩虹球、金币、反弹类遗物。

**生成校验**  
宝箱至少有一条 1-2 次反弹路径；侧道不被初始障碍堵死。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_07",
  "levelNo": 7,
  "nodeType": "NORMAL",
  "displayName": "回声山壁·反弹宝箱",
  "enemyId": "ENEMY_BAT_TRICKSTER",
  "difficultyRange": "115-150",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "rebound_required",
      "treasure_side",
      "mid_density"
    ],
    "colorSlotCount": 4,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "四色；左右侧道；宝箱泡泡 1，倒计时 6 发；彩虹泡泡 1；弱点泡泡 1 放高处或侧面。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "宝箱至少有一条 1-2 次反弹路径；侧道不被初始障碍堵死。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 反弹辅助。reserve 优先给能命中侧边宝箱/弱点路径的颜色；前 6 发不保证拿宝箱，只保证至少 1 条可达路径。",
    "temporaryInjection": "若玩家无穿透/彩虹/炸弹，临时 BALL_RAINBOW x1 放 reserve，玩家可选择是否使用。",
    "antiStall": "miss>=2: nextBall 可消；宝箱倒计时<=2 时不强行喂球，只提示风险。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 5,
    "rowRule": "新增行密度 78%；障碍 2%；特殊 3%；不新增宝箱。"
  },
  "enemyOverlay": {
    "ruleSummary": "蝙蝠每 4 发隐藏 2 个泡泡颜色，持续 2 发；不隐藏宝箱和弱点。"
  },
  "rewardBias": "奖励偏向：镜面墙、彩虹球、金币、反弹类遗物。"
}
```
</details>

### 第 8 关：幻色林·颜色扰动（NORMAL）

- **主题**：颜色变换与球包稳定性检验
- **敌人/Boss**：`ENEMY_GHOST_PAINTER`
- **难度区间**：125-160
- **模板标签**：`color_shift, mid_density, chain_friendly`
- **颜色槽数量**：4
- **压力上限**：5

**棋盘泡泡生成**  
四色；幻影泡泡 3 个，初始显示问号但内部仍映射到 ActiveColorSet；彩虹泡泡 1；无重障碍。

**发射球生成**  
BAG_RANDOM + 颜色扰动保护。幻影数量>=5 且 miss>=1 时 next/reserve 优先可消颜色；不刷玩家已删除颜色。

**临时注入球**  
无固定注入；若玩家球包颜色数<=2，临时注入 BALL_RAINBOW x1 到 drawRandom，避免扰动过强。

**下降新增行**  
新增行密度 80%；幻影概率 8%；特殊 2%。

**敌人/机制刷泡泡**  
幽灵画师每 4 发让 3 个普通泡泡变幻影；每 6 发随机交换一小块颜色。

**保底规则**  
miss>=2: nextBall 可消；若当前球颜色在盘面无任何匹配可能，允许转为 reserve 的可用球。

**奖励对刷球影响**  
奖励偏向：稳定弹仓、彩虹棱镜、删除球、颜色转换。

**生成校验**  
幻影泡泡不超过初始总泡泡 10%；隐藏信息不能覆盖所有底部可消点。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_08",
  "levelNo": 8,
  "nodeType": "NORMAL",
  "displayName": "幻色林·颜色扰动",
  "enemyId": "ENEMY_GHOST_PAINTER",
  "difficultyRange": "125-160",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "color_shift",
      "mid_density",
      "chain_friendly"
    ],
    "colorSlotCount": 4,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "四色；幻影泡泡 3 个，初始显示问号但内部仍映射到 ActiveColorSet；彩虹泡泡 1；无重障碍。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "幻影泡泡不超过初始总泡泡 10%；隐藏信息不能覆盖所有底部可消点。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + 颜色扰动保护。幻影数量>=5 且 miss>=1 时 next/reserve 优先可消颜色；不刷玩家已删除颜色。",
    "temporaryInjection": "无固定注入；若玩家球包颜色数<=2，临时注入 BALL_RAINBOW x1 到 drawRandom，避免扰动过强。",
    "antiStall": "miss>=2: nextBall 可消；若当前球颜色在盘面无任何匹配可能，允许转为 reserve 的可用球。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 5,
    "rowRule": "新增行密度 80%；幻影概率 8%；特殊 2%。"
  },
  "enemyOverlay": {
    "ruleSummary": "幽灵画师每 4 发让 3 个普通泡泡变幻影；每 6 发随机交换一小块颜色。"
  },
  "rewardBias": "奖励偏向：稳定弹仓、彩虹棱镜、删除球、颜色转换。"
}
```
</details>

### 第 9 关：蛛巢前哨·核心护盾（NORMAL）

- **主题**：Boss 前置：核心、护盾、蛛网预演
- **敌人/Boss**：`ENEMY_WEB_ACOLYTE`
- **难度区间**：140-175
- **模板标签**：`core_protect, center_dense, web_light`
- **颜色槽数量**：4
- **压力上限**：5

**棋盘泡泡生成**  
四色；中心核心 1；核心周围保护泡泡 4-6；蛛网 2；炸弹泡泡 1；弱点泡泡 1。

**发射球生成**  
BAG_RANDOM + Boss 预热解核心保底。前 6 发至少出现 1 个可打开核心路径的颜色或特殊球。

**临时注入球**  
若玩家无解障特殊球，临时注入 BALL_BOMB x1；若有，改为无注入。

**下降新增行**  
新增行密度 82%；蛛网概率 6%；特殊 1%。

**敌人/机制刷泡泡**  
蛛巢侍从每 3 发给核心周边 1 个泡泡加蛛网；每 6 发修复 1 个保护泡泡。

**保底规则**  
miss>=2: nextBall 可消；核心未暴露且 shot>=5 时 reserve 优先核心路径颜色。

**奖励对刷球影响**  
奖励偏向：Boss 对策、火焰/炸弹、断网刀、回复。

**生成校验**  
核心初始不可一发秒，但 4-8 发内可理论打开；蛛网不包死核心。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_09",
  "levelNo": 9,
  "nodeType": "NORMAL",
  "displayName": "蛛巢前哨·核心护盾",
  "enemyId": "ENEMY_WEB_ACOLYTE",
  "difficultyRange": "140-175",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "core_protect",
      "center_dense",
      "web_light"
    ],
    "colorSlotCount": 4,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "四色；中心核心 1；核心周围保护泡泡 4-6；蛛网 2；炸弹泡泡 1；弱点泡泡 1。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "核心初始不可一发秒，但 4-8 发内可理论打开；蛛网不包死核心。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + Boss 预热解核心保底。前 6 发至少出现 1 个可打开核心路径的颜色或特殊球。",
    "temporaryInjection": "若玩家无解障特殊球，临时注入 BALL_BOMB x1；若有，改为无注入。",
    "antiStall": "miss>=2: nextBall 可消；核心未暴露且 shot>=5 时 reserve 优先核心路径颜色。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": 5,
    "rowRule": "新增行密度 82%；蛛网概率 6%；特殊 1%。"
  },
  "enemyOverlay": {
    "ruleSummary": "蛛巢侍从每 3 发给核心周边 1 个泡泡加蛛网；每 6 发修复 1 个保护泡泡。"
  },
  "rewardBias": "奖励偏向：Boss 对策、火焰/炸弹、断网刀、回复。"
}
```
</details>

### 第 10 关：蛛后·章节 Boss（BOSS）

- **主题**：三阶段 Boss：蛛网、产卵、蛛网风暴
- **敌人/Boss**：`BOSS_SPIDER_QUEEN`
- **难度区间**：180-240
- **模板标签**：`boss_center_core, center_dense, support_drop`
- **颜色槽数量**：4
- **压力上限**：P1=5, P2=5, P3=4

**棋盘泡泡生成**  
四色；Boss 核心 1；核心周围蛛网 4；左右侧各 1 个弱点泡泡；炸弹泡泡 1；不刷玩家已删除颜色。

**发射球生成**  
BAG_RANDOM + Boss 分阶段保底。P1 前 3 发至少 1 个可消；P2 蜘蛛卵倒计时<=1 时 reserve 优先卵路径颜色；P3 miss>=2 才给可消保底，每阶段最多 2 次。

**临时注入球**  
若玩家整局到 Boss 时球包无任何特殊球，则 Boss 开局临时注入 BALL_BOMB x1 + BALL_RAINBOW x1，否则不注入。

**下降新增行**  
P1 新增行蛛网 6%；P2 蛛网 8% + 卵 0-1；P3 蛛网 12%，pressureMax=4。

**敌人/机制刷泡泡**  
P1 每 3 发加蛛网 x2；P2 每 4 发生成蜘蛛卵 x1，3 发后孵化蛛网；P3 玩家空发时加蛛网 x2。

**保底规则**  
P1/P2 miss>=2: nextBall 可消；P3 每阶段最多 2 次保底，之后不强行救场。

**奖励对刷球影响**  
胜利给 Boss 遗物、章节宝箱、回复 30% 最大生命，进入下一章。

**生成校验**  
核心 3-7 发可理论触达；蛛网+卵阶段不超过总泡泡 22%；P3 不生成直接贴底新蛛网。

<details><summary>程序配置 JSON</summary>

```json
{
  "levelId": "CH1_10",
  "levelNo": 10,
  "nodeType": "BOSS",
  "displayName": "蛛后·章节 Boss",
  "enemyId": "BOSS_SPIDER_QUEEN",
  "difficultyRange": "180-240",
  "templateSelector": {
    "mode": "LEGACY_TEMPLATE_POOL",
    "requiredTags": [
      "boss_center_core",
      "center_dense",
      "support_drop"
    ],
    "colorSlotCount": 4,
    "colorPolicy": "MAP_COLOR_SLOTS_TO_ACTIVE_COLOR_SET",
    "bannedTags": [
      "bottom_danger_high",
      "unreachable_core"
    ]
  },
  "boardSpawn": {
    "ruleSummary": "四色；Boss 核心 1；核心周围蛛网 4；左右侧各 1 个弱点泡泡；炸弹泡泡 1；不刷玩家已删除颜色。",
    "usesDeletedColors": false,
    "buildAdaptRatio": "10%",
    "validation": "核心 3-7 发可理论触达；蛛网+卵阶段不超过总泡泡 22%；P3 不生成直接贴底新蛛网。"
  },
  "shotSpawn": {
    "drawMode": "BAG_RANDOM",
    "ruleSummary": "BAG_RANDOM + Boss 分阶段保底。P1 前 3 发至少 1 个可消；P2 蜘蛛卵倒计时<=1 时 reserve 优先卵路径颜色；P3 miss>=2 才给可消保底，每阶段最多 2 次。",
    "temporaryInjection": "若玩家整局到 Boss 时球包无任何特殊球，则 Boss 开局临时注入 BALL_BOMB x1 + BALL_RAINBOW x1，否则不注入。",
    "antiStall": "P1/P2 miss>=2: nextBall 可消；P3 每阶段最多 2 次保底，之后不强行救场。",
    "reservePolicy": "SWAP_WITH_CURRENT_BEFORE_SHOT"
  },
  "pressureSpawn": {
    "pressureMax": "P1=5, P2=5, P3=4",
    "rowRule": "P1 新增行蛛网 6%；P2 蛛网 8% + 卵 0-1；P3 蛛网 12%，pressureMax=4。"
  },
  "enemyOverlay": {
    "ruleSummary": "P1 每 3 发加蛛网 x2；P2 每 4 发生成蜘蛛卵 x1，3 发后孵化蛛网；P3 玩家空发时加蛛网 x2。"
  },
  "rewardBias": "胜利给 Boss 遗物、章节宝箱、回复 30% 最大生命，进入下一章。"
}
```
</details>

## 3. 关键校验规则

| 校验ID | 适用范围 | 规则 | 失败修正 |
|---|---|---|---|

| VAL_COLOR_ACTIVE | 所有关卡 | 普通棋盘颜色必须属于 ActiveColorSet；被删除颜色不作为主色 | 重新映射 ColorSlot；若仍失败，换模板 |

| VAL_OPENING_CHOICES | 1-10 | 开局至少 2 个有效射击选择；第 1 关至少 3 个 | 修改底部 1-2 个泡泡颜色；或重排 current/next/reserve |

| VAL_SPECIAL_PATH | 3,5,9,10 | 需要解障/核心关，前 N 发理论可出现解法 | 注入临时特殊球；或移除 1 个阻挡障碍 |

| VAL_OBSTACLE_RATIO | 3-10 | 障碍/机制泡泡不超过当前关卡上限 | 降低 EnemyOverlay 初始数量；随机移除非关键障碍 |

| VAL_BOTTOM_SAFETY | 所有关卡 | 初始底部距死亡线不小于关卡配置 | 整体上移；删除底部最危险泡泡 |

| VAL_CORE_REACHABLE | 9,10 | 核心必须在合理发数内可触达，且不被蛛网/石头完全包死 | 打开一个侧路径；替换一个护盾泡泡为普通颜色 |

| VAL_PRESSURE_ROW | 所有关卡 | 新增行不得生成玩家无法处理的普通颜色 | 使用当前 ColorSlotMapping 重生成新增行 |

| VAL_NO_HARD_FEED | 5-10 | 高阶关不能每次都给完美球，只允许保底和路径辅助 | 限制保底次数；保底只给可消颜色不直接给特殊 |

## 4. 程序伪代码


```ts
function generateBattleBoard(runState, levelConfig) {
  const activeColors = getActiveColorSet(runState.ballBag);
  let template = selectLegacyTemplate(levelConfig.templateSelector, activeColors);
  let colorMap = mapColorSlots(template, activeColors, runState.relics);

  let board = instantiateTemplate(template, colorMap);
  applyBoardSpawn(board, levelConfig.boardSpawn);
  applyEnemyOverlay(board, levelConfig.enemyOverlay);

  let validation = validateBoard(board, levelConfig);
  if (!validation.ok) {
    board = repairBoard(board, validation);
  }
  if (!validateBoard(board, levelConfig).ok) {
    template = reselectTemplate(levelConfig.templateSelector);
    return generateBattleBoard(runState, levelConfig);
  }
  return board;
}

function initShotSpawn(runState, levelConfig, board) {
  let drawPile = shuffle(copyBallBag(runState.ballBag));
  let tempBalls = createTemporaryInjection(levelConfig.shotSpawn, runState, board);
  insertTemporaryBalls(drawPile, tempBalls);

  let current = drawWithOpeningPolicy(drawPile, board, levelConfig);
  let next = drawWithOpeningPolicy(drawPile, board, levelConfig);
  let reserve = drawReserveBall(drawPile, board, levelConfig);

  return { drawPile, discardPile: [], current, next, reserve };
}

function afterShotResolve(battleState, levelConfig) {
  resolveMatchAndDrop(battleState.board);
  resolveDamageAndEffects(battleState);

  updateEnemyIntent(battleState);
  updatePressure(battleState);

  if (battleState.missCount >= levelConfig.antiStall.threshold) {
    applyAntiStall(battleState, levelConfig);
  }

  drawNextBall(battleState);
}
```
