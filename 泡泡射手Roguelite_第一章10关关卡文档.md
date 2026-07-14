# 泡泡射手 Roguelite 第一章 10关关卡文档
版本：V0.1

## 1. 关卡结构
| 关卡 | 类型 | 怪物类型 | 敌人/Boss | 目标 | 核心机制 |
|---:|---|---|---|---|---|
| 1 | NORMAL_BATTLE | 普通怪 | 小史莱姆 / `ENEMY_SMALL_SLIME` | 击败敌人 | 基础匹配、掉落伤害教学 |
| 2 | NORMAL_BATTLE | 普通怪 | 石壳精灵 / `ENEMY_STONE_SPRITE` | 击败敌人 | 石头泡泡教学：不能匹配，只能爆破或掉落 |
| 3 | NORMAL_BATTLE | 普通怪 | 小蛛灵 / `ENEMY_WEBLING` | 击败敌人 | 蛛网：可消除，但不会因失联掉落 |
| 4 | NORMAL_BATTLE | 普通怪 | 毒菇 / `ENEMY_POISON_MUSHROOM` | 击败敌人 | 毒液污染与倒计时优先级 |
| 5 | ELITE_BATTLE | 精英怪 | 锁网石卫 / `ELITE_STONE_WEB_GUARDIAN` | 击败精英怪 | 石头+蛛网组合；精英强奖励 |
| 6 | NORMAL_BATTLE | 普通怪 | 雾影幽灵 / `ENEMY_GHOST` | 击败敌人 | 隐藏颜色：部分泡泡变为问号，命中或相邻消除后显示 |
| 7 | NORMAL_BATTLE | 普通怪 | 锁链守卫 / `ENEMY_CHAIN_GUARD` | 击败敌人；额外目标：清除2段锁链 | 锁链横向阻隔，需要炸弹/穿透/相邻消除处理 |
| 8 | NORMAL_BATTLE | 普通怪 | 宝箱拟态怪 / `ENEMY_TREASURE_MIMIC` | 击败敌人；可选：6发内清除宝箱泡泡 | 贪婪目标：奖励与压力取舍 |
| 9 | NORMAL_BATTLE | 普通怪 | 冰核侍从 / `ENEMY_BOSS_ACOLYTE` | 击败敌人；清除冰核可使敌人易伤2发 | Boss前演练：核心泡泡、易伤窗口、意图预判 |
| 10 | BOSS_BATTLE | Boss怪 | 史莱姆王 / `BOSS_ICE_SLIME_KING` | 击败Boss | 三阶段Boss：召唤小怪、冰盾核心、终局压力加速 |

## 2. 初始状态假设
- 玩家 HP：30
- 初始球包：红球 x3、蓝球 x3、黄球 x3、绿球 x3、炸弹球 x1
- 发射栏：当前球 + 下一球 + 备用球
- 基础消除：3 个以上同色连接消除
- 伤害换算：清除 1 个泡泡 = 1 点基础伤害；掉落 1 个泡泡 = 1 点坠落伤害
- 压力规则：每发射 1 次压力 +1，压力满后顶部新增 1 行并整体下降
- 旧关卡融合：从 1500 关模板中按标签和难度筛选，旧颜色转 ColorSlot 后再按玩家球包映射

## 3. 关卡详表

### CH1_01：第 1 关 - 小史莱姆
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_SMALL_SLIME`
- HP：24
- 目标：击败敌人
- 颜色槽数量：3
- 压力上限：6
- 初始障碍：无
- 初始特殊泡泡：金币泡泡 x1
- 敌人意图：每4发：攻击玩家3点
- 旧模板筛选：standard, low_density, chain_friendly | difficulty 45-70
- 棋盘结构：8列 x 7-8行；底部留足空间；至少2个开局可消点。
- 颜色规则：从玩家球包取3个主色；A/B/C按球包权重映射；禁止出现玩家不可发射普通色。
- 下降新增行：新增行仅普通泡泡，3色团块生成。
- 校验规则：开局至少2个MATCH机会；至少1个潜在掉落点；底部安全距离≥3行。
- 基础金币：6
- 胜利奖励：普通三选一：添加普通球/添加炸弹球/回复HP
- 关卡结束流程：胜利→金币+6→普通奖励三选一→进入第2关
- 设计目的：让玩家理解：消除=伤害，掉落=额外伤害，压力倒计时。

### CH1_02：第 2 关 - 石壳精灵
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_STONE_SPRITE`
- HP：30
- 目标：击败敌人
- 颜色槽数量：3
- 压力上限：5
- 初始障碍：石头泡泡 x2
- 初始特殊泡泡：炸弹泡泡 x1
- 敌人意图：每4发：生成1个石头泡泡
- 旧模板筛选：standard, mid_density, stone_light | difficulty 65-90
- 棋盘结构：8列 x 8行；中层放置石头，不堵底部。
- 颜色规则：3色；如果玩家已删除某色，则自动合并ColorSlot。
- 下降新增行：普通泡泡为主；10%概率带1个石头，若压力连续触发则禁止连续出石头。
- 校验规则：石头不得占据唯一核心路径；底部两行石头数量≤1。
- 基础金币：8
- 胜利奖励：普通三选一：添加火焰球/添加炸弹球/删除1颗普通球
- 关卡结束流程：胜利→金币+8→普通奖励三选一→进入第3关
- 设计目的：让玩家使用炸弹或打支撑点处理障碍。

### CH1_03：第 3 关 - 小蛛灵
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_WEBLING`
- HP：34
- 目标：击败敌人
- 颜色槽数量：4
- 压力上限：5
- 初始障碍：蛛网修饰 x3
- 初始特殊泡泡：彩虹泡泡 x1
- 敌人意图：每3发：随机2个泡泡加蛛网
- 旧模板筛选：mid_density, support_drop, web_light | difficulty 80-105
- 棋盘结构：8列 x 8行；存在明显挂载区；蛛网放在挂载支撑附近。
- 颜色规则：4色；优先使用当前球包前4个颜色权重。
- 下降新增行：新增行可带1个蛛网修饰，概率15%。
- 校验规则：蛛网不得覆盖所有支撑点；至少保留1条掉落解法。
- 基础金币：9
- 胜利奖励：普通三选一：断网刀遗物/添加彩虹球/添加蓝球
- 关卡结束流程：胜利→金币+9→普通奖励三选一→进入第4关
- 设计目的：让玩家理解蛛网会克制掉落流，需要先处理。

### CH1_04：第 4 关 - 毒菇
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_POISON_MUSHROOM`
- HP：40
- 目标：击败敌人
- 颜色槽数量：4
- 压力上限：5
- 初始障碍：毒液泡泡 x2
- 初始特殊泡泡：治疗泡泡 x1 / 炸弹泡泡 x1
- 敌人意图：每3发：污染2个普通泡泡
- 旧模板筛选：mid_density, poison_safe, standard | difficulty 95-125
- 棋盘结构：8列 x 8-9行；毒液位于中层，不直接贴底。
- 颜色规则：4色；Build主色权重+5%。
- 下降新增行：新增行普通泡泡为主；毒菇行动独立负责污染。
- 校验规则：毒液不允许放在底部最后2行；毒液不得封死唯一消除路径。
- 基础金币：10
- 胜利奖励：普通三选一：添加冰冻球/删除1颗普通球/回复6HP
- 关卡结束流程：胜利→金币+10→普通奖励三选一→进入第5关精英战
- 设计目的：精英关前的压力测试，促使玩家做清障与输出取舍。

### CH1_05：第 5 关 - 锁网石卫
- 类型：ELITE_BATTLE / 精英怪
- 敌人ID：`ELITE_STONE_WEB_GUARDIAN`
- HP：70
- 目标：击败精英怪
- 颜色槽数量：4
- 压力上限：5
- 初始障碍：石头泡泡 x4 / 蛛网修饰 x4
- 初始特殊泡泡：炸弹泡泡 x2 / 彩虹泡泡 x1
- 敌人意图：奇数行动：加蛛网2；偶数行动：生成石头1；每6发攻击6点
- 旧模板筛选：elite_candidate, mid_density, support_drop | difficulty 135-170
- 棋盘结构：8列 x 9行；障碍集中中层；下层保留至少2条射击路径。
- 颜色规则：4色；不新增被删除颜色。
- 下降新增行：新增行有15%石头或蛛网；同一行最多1个障碍。
- 校验规则：初始可用特殊泡泡至少1个；障碍比例≤18%；至少2条解法。
- 基础金币：18
- 胜利奖励：必得1个遗物 + 球包奖励三选一
- 关卡结束流程：胜利→金币+18→必得遗物→球包三选一→进入第6关
- 设计目的：检验前4关构筑是否能处理障碍；给一次强成长。

### CH1_06：第 6 关 - 雾影幽灵
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_GHOST`
- HP：46
- 目标：击败敌人
- 颜色槽数量：4
- 压力上限：5
- 初始障碍：幻影泡泡 x3
- 初始特殊泡泡：充能泡泡 x1
- 敌人意图：每4发：隐藏3个普通泡泡颜色
- 旧模板筛选：standard, mid_density, scattered | difficulty 105-135
- 棋盘结构：8列 x 8-9行；色块不要过大，避免隐藏机制无意义。
- 颜色规则：4色；若玩家有稳定/预览遗物，则颜色数可+1上限。
- 下降新增行：新增行普通泡泡；幽灵行动负责隐藏。
- 校验规则：隐藏泡泡不得覆盖所有开局可消点；至少2个明牌匹配机会。
- 基础金币：11
- 胜利奖励：普通三选一：预览+1遗物/添加彩虹球/转换1球为冰冻球
- 关卡结束流程：胜利→金币+11→普通奖励三选一→进入第7关
- 设计目的：在精英奖励后引入信息干扰，强调备用球与预览价值。

### CH1_07：第 7 关 - 锁链守卫
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_CHAIN_GUARD`
- HP：52
- 目标：击败敌人；额外目标：清除2段锁链
- 颜色槽数量：4
- 压力上限：5
- 初始障碍：锁链段 x2 / 石头泡泡 x2
- 初始特殊泡泡：穿透泡泡 x1 / 炸弹泡泡 x1
- 敌人意图：每4发：给1条横向区域加锁链；若已有锁链则攻击5点
- 旧模板筛选：rebound_or_path, mid_density, obstacle_medium | difficulty 115-145
- 棋盘结构：8列 x 9行；锁链位于中层横向2段，留有侧边突破路线。
- 颜色规则：4色；反弹流Build可增加侧边弱点泡泡。
- 下降新增行：新增行不带锁链；敌人行动负责锁链。
- 校验规则：锁链不得完全横断棋盘；至少有1个反弹路线和1个爆破路线。
- 基础金币：12
- 胜利奖励：普通三选一：添加穿透球/添加炸弹球/移除普通球
- 关卡结束流程：胜利→金币+12→普通奖励三选一→进入第8关
- 设计目的：为Boss前的护盾/核心结构做准备，引导玩家拿穿透或爆破。

### CH1_08：第 8 关 - 宝箱拟态怪
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_TREASURE_MIMIC`
- HP：56
- 目标：击败敌人；可选：6发内清除宝箱泡泡
- 颜色槽数量：5
- 压力上限：5
- 初始障碍：宝箱泡泡 x1 / 石头 x2
- 初始特殊泡泡：金币泡泡 x2 / 彩虹泡泡 x1
- 敌人意图：每3发：偷取2金币或生成1个金币诱饵；6发后宝箱消失
- 旧模板筛选：treasure_candidate, mid_density, side_reward | difficulty 120-150
- 棋盘结构：8列 x 9行；宝箱放侧边偏中高层，能打但会耗发数。
- 颜色规则：默认5色；若玩家可用颜色不足，则合并为4色并提高石头数量+1。
- 下降新增行：新增行可带金币诱饵，概率10%；不带宝箱。
- 校验规则：宝箱路径不能只依赖单一特殊球；基础通关路径清晰。
- 基础金币：14
- 胜利奖励：普通三选一 + 若宝箱成功则额外金币/稀有奖励权重+10%
- 关卡结束流程：胜利→金币+14→若清宝箱追加奖励→普通奖励三选一→进入第9关
- 设计目的：让玩家在Boss前进行风险收益选择。

### CH1_09：第 9 关 - 冰核侍从
- 类型：NORMAL_BATTLE / 普通怪
- 敌人ID：`ENEMY_BOSS_ACOLYTE`
- HP：64
- 目标：击败敌人；清除冰核可使敌人易伤2发
- 颜色槽数量：4
- 压力上限：5
- 初始障碍：冰核 x1 / 蛛网 x2 / 石头 x2
- 初始特殊泡泡：火焰泡泡 x1 / 彩虹泡泡 x1
- 敌人意图：每3发：给冰核加护盾；每6发：冰锥攻击6点
- 旧模板筛选：center_core, mid_density, pre_boss | difficulty 135-165
- 棋盘结构：8列 x 9行；中心放核心，周围保留2条可突破路径。
- 颜色规则：4色；核心周围优先使用玩家核心Build颜色以提供发挥机会。
- 下降新增行：新增行普通泡泡为主；20%概率带1个冰冻泡泡。
- 校验规则：核心周围至少2个非障碍邻接格；易伤触发后能在2发内输出。
- 基础金币：16
- 胜利奖励：Boss前奖励：回复/删除球/添加彩虹球/添加火焰球
- 关卡结束流程：胜利→金币+16→Boss前奖励三选一→进入第10关Boss
- 设计目的：让玩家熟悉Boss的核心+易伤节奏，减少第10关理解成本。

### CH1_10：第 10 关 - 史莱姆王
- 类型：BOSS_BATTLE / Boss怪
- 敌人ID：`BOSS_ICE_SLIME_KING`
- HP：180
- 目标：击败Boss
- 颜色槽数量：4
- 压力上限：5
- 初始障碍：冰盾核心 x1 / 石头 x3 / 蛛网 x3
- 初始特殊泡泡：火焰泡泡 x2 / 彩虹泡泡 x1 / 炸弹泡泡 x1
- 敌人意图：阶段1召唤；阶段2冰盾；阶段3冰锥+压力加速
- 旧模板筛选：boss_candidate, center_core, mid_density | difficulty 180-230
- 棋盘结构：8列 x 9行；中心核心保护；左右各1个奖励突破点。
- 颜色规则：4色；Boss允许临时生成冰色机制泡泡，但必须可被火焰/炸弹/彩虹处理。
- 下降新增行：阶段1普通新增行；阶段2新增行可带冰盾；阶段3pressureMax=4且新增行可能带冰刺。
- 校验规则：Boss核心不可完全被障碍包围；每阶段至少1条清核路径；障碍比例≤25%。
- 基础金币：35
- 胜利奖励：章节通关奖励：Boss遗物 + 回复30%最大HP + 进入下一章
- 关卡结束流程：胜利→金币+35→Boss遗物→回复30%最大HP→章节结算/进入第2章
- 设计目的：检验球包构筑、遗物触发、压力控制和Boss意图应对。

## 4. 奖励池
| 奖励池ID | 类型 | 奖励内容/示例 | 设计说明 |
|---|---|---|---|
| `POOL_NORMAL_EARLY` | 普通早期 | BALL_RED x1 / BALL_BLUE x1 / BALL_BOMB x1 / HEAL 4 | 帮助玩家理解添加球与回血。 |
| `POOL_NORMAL_OBSTACLE` | 障碍关 | BALL_FIRE x1 / BALL_BOMB x1 / REMOVE_NORMAL x1 / GOLD 12 | 给处理石头的工具。 |
| `POOL_NORMAL_WEB` | 蛛网关 | RELIC_WEB_CUTTER / BALL_RAINBOW x1 / BALL_BLUE x2 | 对抗蛛网或提高容错。 |
| `POOL_NORMAL_PRE_ELITE` | 精英前 | BALL_ICE x1 / REMOVE_NORMAL x1 / HEAL 6 / BALL_FIRE x1 | 给第5关前的生存与构筑修正。 |
| `POOL_ELITE_1` | 精英奖励 | 必得遗物：普通/稀有；额外球包三选一 | 精英关高风险高收益。 |
| `POOL_NORMAL_CONTROL` | 控制关 | RELIC_PREVIEW_LENS / BALL_RAINBOW x1 / TRANSFORM_BLUE_TO_ICE x1 | 对抗隐藏颜色。 |
| `POOL_NORMAL_CHAIN` | 锁链关 | BALL_PIERCE x1 / BALL_BOMB x1 / REMOVE_NORMAL x1 | 给穿透或爆破路线。 |
| `POOL_NORMAL_GREED` | 贪婪关 | GOLD 20 / BALL_RAINBOW x1 / RELIC_GREED_COIN / HEAL 6 | 强化金币与风险收益。 |
| `POOL_NORMAL_PRE_BOSS` | Boss前 | HEAL 8 / REMOVE_NORMAL x1 / BALL_RAINBOW x1 / BALL_FIRE x2 | Boss前构筑修整。 |
| `POOL_BOSS_CH1` | Boss奖励 | BOSS_RELIC_ICE_CORE + HEAL_MAX_HP_30_PERCENT + NEXT_CHAPTER | 章节通关。 |

## 5. 敌人与 Boss 机制
| ID | 类型 | HP | 意图1 | 意图2/被动 | 意图3/阶段 | 备注 |
|---|---|---:|---|---|---|---|
| `ENEMY_SMALL_SLIME` | 普通怪 | 24 | 每4发攻击3点 | - | - | 基础教学敌人 |
| `ENEMY_STONE_SPRITE` | 普通怪 | 30 | 每4发生成1个石头 | 石头不能匹配 | - | 障碍教学 |
| `ENEMY_WEBLING` | 普通怪 | 34 | 每3发加蛛网2 | 蛛网不会因失联掉落 | - | 掉落流反制教学 |
| `ENEMY_POISON_MUSHROOM` | 普通怪 | 40 | 每3发污染2个泡泡 | 毒液压底造成3伤+中毒 | - | 压力与污染教学 |
| `ELITE_STONE_WEB_GUARDIAN` | 精英怪 | 70 | 奇数行动加蛛网2 | 偶数行动生成石头1 | 每6发攻击6点 | 精英组合机制 |
| `ENEMY_GHOST` | 普通怪 | 46 | 每4发隐藏3个泡泡颜色 | 隐藏泡泡命中/相邻消除后显示 | - | 信息干扰 |
| `ENEMY_CHAIN_GUARD` | 普通怪 | 52 | 每4发加锁链 | 已有锁链时改为攻击5点 | - | 路径阻隔 |
| `ENEMY_TREASURE_MIMIC` | 普通怪 | 56 | 每3发偷取金币或生成诱饵 | 宝箱泡泡6发后消失 | - | 风险收益 |
| `ENEMY_BOSS_ACOLYTE` | 普通怪 | 64 | 每3发给冰核加护盾 | 每6发冰锥攻击6点 | 清核后易伤2发 | Boss前机制预演 |
| `BOSS_ICE_SLIME_KING` | Boss怪 | 180 | 阶段1：每3发召唤小史莱姆泡泡 | 阶段2：66%血以下生成冰盾核心 | 阶段3：33%血以下pressureMax=4并冰锥攻击 | 第1章Boss |

## 6. Level JSON 配置示例
以下配置可拆到 `EncounterDefinition`、`BoardGenerateRequest`、`RewardPool` 等文件中。

### CH1_01
```json
{
  "levelId": "CH1_01",
  "order": 1,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_SMALL_SLIME",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人"
  },
  "enemyHp": 24,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "standard",
        "low_density"
      ],
      "preferredTags": [
        "chain_friendly"
      ],
      "bannedTags": [
        "bottom_danger_high",
        "obstacle_heavy"
      ],
      "difficultyRange": [
        45,
        70
      ]
    },
    "colorSlotCount": 3,
    "colorRules": "从玩家球包取3个主色；A/B/C按球包权重映射；禁止出现玩家不可发射普通色。",
    "initialOverlays": [
      {
        "bubbleId": "BUBBLE_COIN",
        "count": 1,
        "positionRule": "MID_SIDE_SAFE"
      }
    ],
    "pressureSpawn": "新增行仅普通泡泡，3色团块生成。",
    "validation": "开局至少2个MATCH机会；至少1个潜在掉落点；底部安全距离≥3行。"
  },
  "pressure": {
    "max": 6,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 6,
    "rewardPoolId": "POOL_NORMAL_EARLY",
    "postFlow": "胜利→金币+6→普通奖励三选一→进入第2关"
  }
}
```

### CH1_02
```json
{
  "levelId": "CH1_02",
  "order": 2,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_STONE_SPRITE",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人"
  },
  "enemyHp": 30,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "standard"
      ],
      "preferredTags": [
        "stone_light",
        "support_drop"
      ],
      "bannedTags": [
        "obstacle_heavy",
        "bottom_danger_high"
      ],
      "difficultyRange": [
        65,
        90
      ]
    },
    "colorSlotCount": 3,
    "colorRules": "3色；如果玩家已删除某色，则自动合并ColorSlot。",
    "initialOverlays": [
      {
        "bubbleId": "BUBBLE_STONE",
        "count": 2,
        "positionRule": "MIDDLE_NON_CRITICAL"
      },
      {
        "bubbleId": "BUBBLE_BOMB",
        "count": 1,
        "positionRule": "NEAR_OBSTACLE_SAFE"
      }
    ],
    "pressureSpawn": "普通泡泡为主；10%概率带1个石头，若压力连续触发则禁止连续出石头。",
    "validation": "石头不得占据唯一核心路径；底部两行石头数量≤1。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 8,
    "rewardPoolId": "POOL_NORMAL_OBSTACLE",
    "postFlow": "胜利→金币+8→普通奖励三选一→进入第3关"
  }
}
```

### CH1_03
```json
{
  "levelId": "CH1_03",
  "order": 3,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_WEBLING",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人"
  },
  "enemyHp": 34,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "mid_density"
      ],
      "preferredTags": [
        "support_drop",
        "chain_friendly"
      ],
      "bannedTags": [
        "web_heavy",
        "bottom_danger_high"
      ],
      "difficultyRange": [
        80,
        105
      ]
    },
    "colorSlotCount": 4,
    "colorRules": "4色；优先使用当前球包前4个颜色权重。",
    "initialOverlays": [
      {
        "modifier": "WEB",
        "count": 3,
        "positionRule": "SUPPORT_NEAR_NOT_ALL"
      },
      {
        "bubbleId": "BUBBLE_RAINBOW",
        "count": 1,
        "positionRule": "MIDDLE_REWARD"
      }
    ],
    "pressureSpawn": "新增行可带1个蛛网修饰，概率15%。",
    "validation": "蛛网不得覆盖所有支撑点；至少保留1条掉落解法。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 9,
    "rewardPoolId": "POOL_NORMAL_WEB",
    "postFlow": "胜利→金币+9→普通奖励三选一→进入第4关"
  }
}
```

### CH1_04
```json
{
  "levelId": "CH1_04",
  "order": 4,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_POISON_MUSHROOM",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人"
  },
  "enemyHp": 40,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "mid_density"
      ],
      "preferredTags": [
        "support_drop"
      ],
      "bannedTags": [
        "bottom_danger_high",
        "too_sparse"
      ],
      "difficultyRange": [
        95,
        125
      ]
    },
    "colorSlotCount": 4,
    "colorRules": "4色；Build主色权重+5%。",
    "initialOverlays": [
      {
        "bubbleId": "BUBBLE_POISON",
        "count": 2,
        "positionRule": "MIDDLE_SAFE_RANDOM"
      },
      {
        "bubbleId": "BUBBLE_HEAL",
        "count": 1,
        "positionRule": "SIDE_RISK_REWARD"
      },
      {
        "bubbleId": "BUBBLE_BOMB",
        "count": 1,
        "positionRule": "NEAR_POISON_SAFE"
      }
    ],
    "pressureSpawn": "新增行普通泡泡为主；毒菇行动独立负责污染。",
    "validation": "毒液不允许放在底部最后2行；毒液不得封死唯一消除路径。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 10,
    "rewardPoolId": "POOL_NORMAL_PRE_ELITE",
    "postFlow": "胜利→金币+10→普通奖励三选一→进入第5关精英战"
  }
}
```

### CH1_05
```json
{
  "levelId": "CH1_05",
  "order": 5,
  "nodeType": "ELITE_BATTLE",
  "enemyId": "ELITE_STONE_WEB_GUARDIAN",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败精英怪"
  },
  "enemyHp": 70,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "elite_candidate"
      ],
      "preferredTags": [
        "support_drop",
        "stone_medium"
      ],
      "bannedTags": [
        "bottom_danger_high",
        "too_sparse"
      ],
      "difficultyRange": [
        135,
        170
      ]
    },
    "colorSlotCount": 4,
    "colorRules": "4色；不新增被删除颜色。",
    "initialOverlays": [
      {
        "bubbleId": "BUBBLE_STONE",
        "count": 4,
        "positionRule": "MIDDLE_NON_CRITICAL"
      },
      {
        "modifier": "WEB",
        "count": 4,
        "positionRule": "SUPPORT_NEAR_LIMITED"
      },
      {
        "bubbleId": "BUBBLE_BOMB",
        "count": 2,
        "positionRule": "NEAR_CLUSTER"
      },
      {
        "bubbleId": "BUBBLE_RAINBOW",
        "count": 1,
        "positionRule": "MIDDLE_REWARD"
      }
    ],
    "pressureSpawn": "新增行有15%石头或蛛网；同一行最多1个障碍。",
    "validation": "初始可用特殊泡泡至少1个；障碍比例≤18%；至少2条解法。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 18,
    "rewardPoolId": "POOL_ELITE_1",
    "postFlow": "胜利→金币+18→必得遗物→球包三选一→进入第6关"
  }
}
```

### CH1_06
```json
{
  "levelId": "CH1_06",
  "order": 6,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_GHOST",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人"
  },
  "enemyHp": 46,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "mid_density"
      ],
      "preferredTags": [
        "scattered"
      ],
      "bannedTags": [
        "obstacle_heavy",
        "bottom_danger_high"
      ],
      "difficultyRange": [
        105,
        135
      ]
    },
    "colorSlotCount": 4,
    "colorRules": "4色；若玩家有稳定/预览遗物，则颜色数可+1上限。",
    "initialOverlays": [
      {
        "modifier": "HIDDEN_COLOR",
        "count": 3,
        "positionRule": "MIDDLE_RANDOM"
      },
      {
        "bubbleId": "BUBBLE_CHARGE",
        "count": 1,
        "positionRule": "SIDE_REWARD"
      }
    ],
    "pressureSpawn": "新增行普通泡泡；幽灵行动负责隐藏。",
    "validation": "隐藏泡泡不得覆盖所有开局可消点；至少2个明牌匹配机会。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 11,
    "rewardPoolId": "POOL_NORMAL_CONTROL",
    "postFlow": "胜利→金币+11→普通奖励三选一→进入第7关"
  }
}
```

### CH1_07
```json
{
  "levelId": "CH1_07",
  "order": 7,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_CHAIN_GUARD",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人；额外目标：清除2段锁链"
  },
  "enemyHp": 52,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "mid_density"
      ],
      "preferredTags": [
        "rebound_required",
        "support_drop"
      ],
      "bannedTags": [
        "too_sparse",
        "bottom_danger_high"
      ],
      "difficultyRange": [
        115,
        145
      ]
    },
    "colorSlotCount": 4,
    "colorRules": "4色；反弹流Build可增加侧边弱点泡泡。",
    "initialOverlays": [
      {
        "modifier": "CHAIN",
        "count": 2,
        "positionRule": "MIDDLE_HORIZONTAL_LIMITED"
      },
      {
        "bubbleId": "BUBBLE_STONE",
        "count": 2,
        "positionRule": "MIDDLE_NON_CRITICAL"
      },
      {
        "bubbleId": "BUBBLE_PIERCE",
        "count": 1,
        "positionRule": "REBOUND_REWARD"
      },
      {
        "bubbleId": "BUBBLE_BOMB",
        "count": 1,
        "positionRule": "NEAR_CHAIN"
      }
    ],
    "pressureSpawn": "新增行不带锁链；敌人行动负责锁链。",
    "validation": "锁链不得完全横断棋盘；至少有1个反弹路线和1个爆破路线。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 12,
    "rewardPoolId": "POOL_NORMAL_CHAIN",
    "postFlow": "胜利→金币+12→普通奖励三选一→进入第8关"
  }
}
```

### CH1_08
```json
{
  "levelId": "CH1_08",
  "order": 8,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_TREASURE_MIMIC",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人；可选：6发内清除宝箱泡泡"
  },
  "enemyHp": 56,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "mid_density"
      ],
      "preferredTags": [
        "side_reward",
        "chain_friendly"
      ],
      "bannedTags": [
        "bottom_danger_high"
      ],
      "difficultyRange": [
        120,
        150
      ]
    },
    "colorSlotCount": 5,
    "colorRules": "默认5色；若玩家可用颜色不足，则合并为4色并提高石头数量+1。",
    "initialOverlays": [
      {
        "bubbleId": "BUBBLE_CHEST",
        "count": 1,
        "positionRule": "SIDE_RISK_REWARD",
        "countdown": 6
      },
      {
        "bubbleId": "BUBBLE_COIN",
        "count": 2,
        "positionRule": "SIDE_REWARD"
      },
      {
        "bubbleId": "BUBBLE_RAINBOW",
        "count": 1,
        "positionRule": "MIDDLE_REWARD"
      },
      {
        "bubbleId": "BUBBLE_STONE",
        "count": 2,
        "positionRule": "MIDDLE_NON_CRITICAL"
      }
    ],
    "pressureSpawn": "新增行可带金币诱饵，概率10%；不带宝箱。",
    "validation": "宝箱路径不能只依赖单一特殊球；基础通关路径清晰。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 14,
    "rewardPoolId": "POOL_NORMAL_GREED",
    "postFlow": "胜利→金币+14→若清宝箱追加奖励→普通奖励三选一→进入第9关"
  }
}
```

### CH1_09
```json
{
  "levelId": "CH1_09",
  "order": 9,
  "nodeType": "NORMAL_BATTLE",
  "enemyId": "ENEMY_BOSS_ACOLYTE",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败敌人；清除冰核可使敌人易伤2发"
  },
  "enemyHp": 64,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "mid_density"
      ],
      "preferredTags": [
        "center_dense",
        "support_drop"
      ],
      "bannedTags": [
        "bottom_danger_high",
        "too_sparse"
      ],
      "difficultyRange": [
        135,
        165
      ]
    },
    "colorSlotCount": 4,
    "colorRules": "4色；核心周围优先使用玩家核心Build颜色以提供发挥机会。",
    "initialOverlays": [
      {
        "bubbleId": "BUBBLE_ICE_CORE",
        "count": 1,
        "positionRule": "CENTER_NEAR"
      },
      {
        "modifier": "WEB",
        "count": 2,
        "positionRule": "CORE_RING_LIMITED"
      },
      {
        "bubbleId": "BUBBLE_STONE",
        "count": 2,
        "positionRule": "CORE_RING_NON_BLOCKING"
      },
      {
        "bubbleId": "BUBBLE_FIRE",
        "count": 1,
        "positionRule": "CORE_PATH_REWARD"
      },
      {
        "bubbleId": "BUBBLE_RAINBOW",
        "count": 1,
        "positionRule": "SIDE_REWARD"
      }
    ],
    "pressureSpawn": "新增行普通泡泡为主；20%概率带1个冰冻泡泡。",
    "validation": "核心周围至少2个非障碍邻接格；易伤触发后能在2发内输出。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 16,
    "rewardPoolId": "POOL_NORMAL_PRE_BOSS",
    "postFlow": "胜利→金币+16→Boss前奖励三选一→进入第10关Boss"
  }
}
```

### CH1_10
```json
{
  "levelId": "CH1_10",
  "order": 10,
  "nodeType": "BOSS_BATTLE",
  "enemyId": "BOSS_ICE_SLIME_KING",
  "objective": {
    "type": "DEFEAT_ENEMY",
    "description": "击败Boss"
  },
  "enemyHp": 180,
  "boardGeneration": {
    "templateQuery": {
      "requiredTags": [
        "boss_candidate",
        "center_core"
      ],
      "preferredTags": [
        "center_dense",
        "support_drop"
      ],
      "bannedTags": [
        "bottom_danger_high",
        "too_sparse"
      ],
      "difficultyRange": [
        180,
        230
      ]
    },
    "colorSlotCount": 4,
    "colorRules": "4色；Boss允许临时生成冰色机制泡泡，但必须可被火焰/炸弹/彩虹处理。",
    "initialOverlays": [
      {
        "bubbleId": "BUBBLE_BOSS_CORE",
        "count": 1,
        "positionRule": "CENTER_NEAR"
      },
      {
        "bubbleId": "BUBBLE_STONE",
        "count": 3,
        "positionRule": "CORE_RING_NON_BLOCKING"
      },
      {
        "modifier": "WEB",
        "count": 3,
        "positionRule": "CORE_RING_LIMITED"
      },
      {
        "bubbleId": "BUBBLE_FIRE",
        "count": 2,
        "positionRule": "CORE_PATH_REWARD"
      },
      {
        "bubbleId": "BUBBLE_RAINBOW",
        "count": 1,
        "positionRule": "SIDE_REWARD"
      },
      {
        "bubbleId": "BUBBLE_BOMB",
        "count": 1,
        "positionRule": "NEAR_CORE"
      }
    ],
    "pressureSpawn": "阶段1普通新增行；阶段2新增行可带冰盾；阶段3pressureMax=4且新增行可能带冰刺。",
    "validation": "Boss核心不可完全被障碍包围；每阶段至少1条清核路径；障碍比例≤25%。"
  },
  "pressure": {
    "max": 5,
    "addRowOnFull": true,
    "bottomLineDamage": true
  },
  "reward": {
    "baseGold": 35,
    "rewardPoolId": "POOL_BOSS_CH1",
    "postFlow": "胜利→金币+35→Boss遗物→回复30%最大HP→章节结算/进入第2章"
  },
  "bossPhases": [
    {
      "phaseId": "PHASE_1_SUMMON",
      "hpPercentFrom": 100,
      "hpPercentTo": 66,
      "intent": {
        "everyShots": 3,
        "effect": "SPAWN_BUBBLE_SMALL_SLIME x2"
      }
    },
    {
      "phaseId": "PHASE_2_ICE_SHIELD",
      "hpPercentFrom": 66,
      "hpPercentTo": 33,
      "intent": {
        "everyShots": 3,
        "effect": "SPAWN_OR_REINFORCE_BUBBLE_BOSS_CORE"
      }
    },
    {
      "phaseId": "PHASE_3_PRESSURE",
      "hpPercentFrom": 33,
      "hpPercentTo": 0,
      "pressureOverride": {
        "max": 4
      },
      "intent": {
        "everyShots": 3,
        "effect": "ICE_SPIKE_DAMAGE_7_AND_FREEZE_RANDOM_2"
      }
    }
  ]
}
```
