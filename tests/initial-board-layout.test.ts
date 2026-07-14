import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isValidHexCell, splitCeilingConnected } from "../app/board-connectivity.ts";
import { extendProjectedLayoutToRow, projectCompleteLevelDateLayout, projectLevelDateLayout, parseLevelDateLayout } from "../app/initial-board-layout.ts";
import { chapterLevels } from "../app/levels.ts";

test("leveldate 1-10 均可按旧 11 列坐标生成有效初始格", () => {
  const signatures = new Set<string>();

  chapterLevels.forEach((level) => {
    const raw = readFileSync(new URL(`../leveldate/${level.order}.txt`, import.meta.url), "utf8");
    const layout = parseLevelDateLayout(raw, `${level.order}.txt`);
    const maxInitialRow = Math.min(level.rows - 1, 13 - level.spawn.bottomSafetyRows);
    const projected = extendProjectedLayoutToRow(
      projectLevelDateLayout(layout, maxInitialRow),
      maxInitialRow,
    );
    const keys = projected.map((cell) => `${cell.row}:${cell.col}`);
    const visibleRows = new Set(projected.map((cell) => cell.row)).size;

    assert.ok(projected.length >= 35, `第 ${level.order} 关读取后的初始球过少`);
    assert.ok(visibleRows >= 10 && visibleRows <= 12, `第 ${level.order} 关初始行数应为 10–12`);
    assert.equal(visibleRows, level.rows, `第 ${level.order} 关初始行数应匹配关卡配置`);
    assert.equal(new Set(keys).size, projected.length, `第 ${level.order} 关存在重复棋盘格`);
    projected.forEach((cell) => assert.equal(isValidHexCell(cell.row, cell.col, 13), true));

    const connectivity = splitCeilingConnected(
      projected.map((cell) => ({ id: `${cell.row}:${cell.col}`, row: cell.row, col: cell.col })),
      13,
    );
    assert.ok(connectivity.kept.length >= 35, `第 ${level.order} 关缺少足够的顶部支撑球`);
    signatures.add(projected.map((cell) => `${cell.row}:${cell.col}:${cell.sourceColor}`).join("|"));
  });

  assert.equal(signatures.size, 10, "十关初始棋盘不应复用同一份配置");
});

test("初始生成只读取顶部区域，不扩展当前棋盘行数", () => {
  const layout = parseLevelDateLayout(JSON.stringify({
    bubbles: [
      { x: 0, y: 10, c: 1, t: 0 },
      { x: 10, y: 10, c: 2, t: 0 },
      { x: 5, y: 30, c: 3, t: 0 },
    ],
  }), "fixture");
  const projected = projectLevelDateLayout(layout, 6);

  assert.deepEqual(projected.map(({ row, col }) => ({ row, col })), [
    { row: 0, col: 0 },
    { row: 0, col: 10 },
  ]);
});

test("完整关卡阵型保留全部 leveldate 行，不拆分待补队列", () => {
  const layout = parseLevelDateLayout(JSON.stringify({
    bubbles: Array.from({ length: 6 }, (_, row) => ({ x: 0, y: row, c: row, t: 0 })),
  }), "complete-fixture");
  const complete = projectCompleteLevelDateLayout(layout, 3);

  assert.deepEqual(
    complete.map(({ row, sourceColor }) => ({ row, sourceColor })),
    [
      { row: 0, sourceColor: 0 },
      { row: 1, sourceColor: 1 },
      { row: 2, sourceColor: 2 },
      { row: 3, sourceColor: 3 },
      { row: 4, sourceColor: 4 },
      { row: 5, sourceColor: 5 },
    ],
  );
});

test("1-10 关完整阵型不会截断 leveldate 的任何逻辑行", () => {
  chapterLevels.forEach((level) => {
    const raw = readFileSync(new URL(`../leveldate/${level.order}.txt`, import.meta.url), "utf8");
    const layout = parseLevelDateLayout(raw, `${level.order}.txt`);
    const sourceMinRow = Math.min(...layout.bubbles.map((bubble) => bubble.y));
    const sourceMaxRow = Math.max(...layout.bubbles.map((bubble) => bubble.y)) - sourceMinRow;
    const expectedMaxRow = Math.max(sourceMaxRow, level.rows - 1);
    const complete = projectCompleteLevelDateLayout(layout, level.rows);

    assert.equal(Math.max(...complete.map((cell) => cell.row)), expectedMaxRow);
    assert.ok(complete.length >= layout.bubbles.length);
    layout.bubbles.forEach((bubble) => {
      assert.ok(complete.some((cell) => cell.row === bubble.y - sourceMinRow && cell.col === bubble.x));
    });
  });
});

test("损坏的 leveldate 配置会在生成棋盘前报错", () => {
  assert.throws(
    () => parseLevelDateLayout('{"bubbles":[{"x":"bad"}]}', "broken"),
    /坐标或类型无效/,
  );
});
