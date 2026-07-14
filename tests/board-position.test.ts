import assert from "node:assert/strict";
import test from "node:test";
import { calculateBoardOffsetY, getBoardHighRow, getCollapseRowForOffset } from "../app/board-position.ts";

const options = { rowGap: 55, thresholdRow: 9, visibleHighRow: 8.1, invisibleAreaY: 0 };

test("BoardPosition 只由最低占用行计算容器偏移，不修改泡泡 row", () => {
  const board = [{ row: 0 }, { row: 16 }];
  const snapshot = board.map((bubble) => ({ ...bubble }));

  assert.equal(getBoardHighRow(board), 16);
  assert.equal(calculateBoardOffsetY(board, options), -434.5);
  assert.deepEqual(board, snapshot);
});

test("最低占用行低于阈值时棋盘容器回到原位", () => {
  assert.equal(calculateBoardOffsetY([{ row: 8 }], options), 0);
});

test("压力深度独立于普通 BoardPosition，避免抵消压力下压", () => {
  const beforePressure = calculateBoardOffsetY([{ row: 16 }], options);
  const afterPressure = calculateBoardOffsetY([{ row: 17 }], { ...options, pressureDepthRows: 1 });
  assert.equal(afterPressure, beforePressure);
});

test("危险线根据棋盘容器偏移换算为逻辑行", () => {
  assert.equal(getCollapseRowForOffset(0, 804, 38, 55), 13);
  assert.equal(getCollapseRowForOffset(-440, 804, 38, 55), 21);
});
