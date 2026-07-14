import { rewardCatalog, type LevelConfig, type RewardEffect } from "./levels.ts";

const relicRewardEffects = new Set<RewardEffect>([
  "WEB_CUTTER",
  "PREVIEW_LENS",
  "PHOENIX_FEATHER",
  "ADD_RELIC",
  "BOSS_RELIC",
]);

export function isRelicRewardEffect(effect: RewardEffect) {
  return relicRewardEffects.has(effect);
}

export function getAvailableRewardOptions(level: LevelConfig) {
  const rewards = level.rewardIds.map((id) => rewardCatalog[id]);
  return level.nodeType === "ELITE_BATTLE"
    ? rewards
    : rewards.filter((reward) => !isRelicRewardEffect(reward.effect));
}
