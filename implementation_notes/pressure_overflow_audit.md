# 压迫触底销毁实现审计

## 当前模块与入口

| 能力 | 模块路径 | 入口 | 当前调用顺序 |
|---|---|---|---|
| 压力满判定 | `app/page.tsx` | `resolveShot` 中 `nextPressure >= pressureMax` | 射击结算、敌人行动后检查压力 |
| 顶部新行与棋盘下移 | `app/page.tsx` | `addPressureRow` | 全盘 `row + 1`，收集 `row > MAX_ROW`，再生成第 0 行 |
| 压迫线检测 | `app/page.tsx` | `addPressureRow` | 使用棋盘格行号判断，不依赖视觉坐标 |
| 顶部连接检测 | `app/page.tsx` | `removeFloating` | 从第 0 行广度搜索，返回 `kept` 与 `dropped` |
| 普通消除与掉落 | `app/page.tsx` | `resolveShot` | 匹配/特殊清除后调用 `removeFloating`；掉落计入敌人伤害、金币、分数和遗物 |
| 特殊球连锁 | `app/page.tsx` | `expandBoardBombClears` | 只用于玩家清除路径 |
| 玩家伤害与护盾 | `app/survival.ts` | `resolvePlayerDamage` | 使用唯一 `eventId` 幂等，先护盾后生命 |
| 倒地、免死与复活 | `app/page.tsx`、`app/survival.ts` | `performDeathPrevent`、`createFailureState`、`performManualRevive` | 射击事务末尾进入免死或倒地 UI |
| 技能、金币、统计 | `app/page.tsx` | `setSkillCharge`、`setGold`、`setScore` | 当前只消费玩家清除的 `cleared/dropped` 集合 |

## 审计发现

1. 旧压迫路径会排除直接越线球，并把悬空球从最终盘面移除，但没有显式销毁来源和统一结果结构。
2. `removeFloating` 在没有越线球时也会执行，可能把与本次压迫无关的悬空结构提前清除。
3. 金币和宝箱沿用普通泡泡权重 1，不符合新规则的默认权重 0。
4. 直接越线球与二次失联球虽然没有进入玩家奖励集合，但缺少可验证的禁用收益上下文、丢失奖励统计和结构化事件。
5. 压迫伤害依靠 DamageEvent 防止重复扣血，但缺少独立 `resolveId` 对整次棋盘事务做幂等保护。

## 潜在重复触发点

- 同一发射的压力分支因恢复或重复回调再次进入。
- DamageEvent 已结算但棋盘状态尚未保存时恢复页面。
- 触底奖励球同时被普通金币统计读取。
- 二次失联泡泡误进入普通 `dropped` 集合后产生敌人伤害或技能充能。

## 兼容策略

- 保留 `removeFloating`、普通匹配、炸弹扩散和普通掉落奖励路径。
- 新增压力专用解析器，只在压力满分支调用。
- 旧关卡继续使用统一默认配置；关卡只需传入原有伤害上限即可工作。
- 继续复用 `resolvePlayerDamage` 处理护盾、生命与 DamageEvent 幂等。
