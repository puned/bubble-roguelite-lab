import assert from "node:assert/strict";
import test from "node:test";
import { chapterLevels } from "../app/levels.ts";
import { getAvailableRewardOptions, isRelicRewardEffect } from "../app/reward-rules.ts";

test("普通怪和 Boss 的奖励中不包含遗物", () => {
  chapterLevels
    .filter((level) => level.nodeType !== "ELITE_BATTLE")
    .forEach((level) => {
      const rewards = getAvailableRewardOptions(level);
      assert.equal(rewards.some((reward) => isRelicRewardEffect(reward.effect)), false, level.id);
      assert.equal(rewards.length, 3, `${level.id} 应保留三项非遗物奖励`);
    });
});

test("击败精英怪可以出现遗物奖励", () => {
  const elite = chapterLevels.find((level) => level.nodeType === "ELITE_BATTLE");
  assert.ok(elite);
  const rewards = getAvailableRewardOptions(elite);
  assert.equal(rewards.some((reward) => isRelicRewardEffect(reward.effect)), true);
});

test("Boss 奖励表中不存在 Boss 遗物", () => {
  const boss = chapterLevels.find((level) => level.nodeType === "BOSS_BATTLE");
  assert.ok(boss);
  assert.equal(getAvailableRewardOptions(boss).some((reward) => reward.effect === "BOSS_RELIC"), false);
});
