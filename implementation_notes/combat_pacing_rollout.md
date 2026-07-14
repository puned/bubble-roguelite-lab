# 怪物血量与战斗时长优化落地说明

## 配置与回退

- 默认灰度档位为 `v1`；开发环境调试面板可切换 `legacy` 并立即重开当前关。
- 关卡 HP、护盾、目标发数、目标时长与数据化意图位于 `configs/combat/`。
- 动态战力缩放默认关闭。需要回退时只切换血量档位，不改盘面与玩家生存配置。

## 结算约束

- 护盾先于 HP 承伤；CH1-04 护盾期掉落伤害降低 20%，破盾后下一发增伤 20%。
- CH1-05 护盾只恢复一次；重复恢复请求会被幂等拒绝。
- Boss 使用 220 / 240 / 260 三阶段 HP 与 0 / 20 / 40 阶段护盾。
- 阶段结束锁血，过量伤害仅按 30% 继承，且单发不能跨过完整下一阶段。
- Boss 转阶段展示 2.8 秒过场，重置意图计数，本发不下压，下一发不触发敌人意图。

## 事件与统计

- `ON_PLAYER_SHOT_CONFIRMED`
- `ON_DAMAGE_DEALT_TO_ENEMY`（按 MATCH_CLEAR / BUBBLE_DROP / SPECIAL_BALL 等来源拆分）
- `ON_ENEMY_SHIELD_BROKEN`
- `ON_ENEMY_INTENT_TRIGGERED` / `ON_ENEMY_ATTACKED_PLAYER`
- `ON_BOSS_PHASE_HP_ZERO` / `ON_BOSS_PHASE_CHANGED`
- `ON_ENEMY_DEFEATED`
- `ON_COMBAT_FINISHED`

离线报告：`npm run report:pacing -- <combat-telemetry.json|jsonl>`。报告输出时长 P25/P50/P75/P90、发数、有效伤害、玩家承伤和建议 EHP；单轮建议限制在 +25% / -20%。生产调数至少积累 200 局样本。
