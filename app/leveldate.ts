import level1Raw from "../leveldate/1.txt?raw";
import level2Raw from "../leveldate/2.txt?raw";
import level3Raw from "../leveldate/3.txt?raw";
import level4Raw from "../leveldate/4.txt?raw";
import level5Raw from "../leveldate/5.txt?raw";
import level6Raw from "../leveldate/6.txt?raw";
import level7Raw from "../leveldate/7.txt?raw";
import level8Raw from "../leveldate/8.txt?raw";
import level9Raw from "../leveldate/9.txt?raw";
import level10Raw from "../leveldate/10.txt?raw";
import { parseLevelDateLayout, type LevelDateLayout } from "./initial-board-layout";

const levelDateLayouts: LevelDateLayout[] = [
  level1Raw,
  level2Raw,
  level3Raw,
  level4Raw,
  level5Raw,
  level6Raw,
  level7Raw,
  level8Raw,
  level9Raw,
  level10Raw,
].map((raw, index) => parseLevelDateLayout(raw, `leveldate/${index + 1}.txt`));

export function getLevelDateLayout(levelOrder: number) {
  const layout = levelDateLayouts[levelOrder - 1];
  if (!layout) throw new Error(`未找到第 ${levelOrder} 关 leveldate 配置`);
  return layout;
}
