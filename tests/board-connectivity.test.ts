import assert from "node:assert/strict";
import test from "node:test";
import { getInsertedRowBridgeCells, getSupportedEmptyCells, splitCeilingConnected } from "../app/board-connectivity.ts";

test("孤立的两颗相邻泡泡都会被判定为下落", () => {
  const board = [
    { id: "top", row: 0, col: 0 },
    { id: "supported-1", row: 1, col: 0 },
    { id: "supported-2", row: 2, col: 0 },
    { id: "isolated-blue-1", row: 4, col: 5 },
    { id: "isolated-blue-2", row: 5, col: 5 },
  ];
  const result = splitCeilingConnected(board, 9);
  assert.deepEqual(result.kept.map((bubble) => bubble.id), ["top", "supported-1", "supported-2"]);
  assert.deepEqual(result.dropped.map((bubble) => bubble.id), ["isolated-blue-1", "isolated-blue-2"]);
});

test("吸附兜底只返回连接顶行或已有泡泡的空格", () => {
  const board = [
    ...Array.from({ length: 11 }, (_, col) => ({ id: `r0-${col}`, row: 0, col })),
    ...Array.from({ length: 10 }, (_, col) => ({ id: `r1-${col}`, row: 1, col })),
  ];
  const candidates = getSupportedEmptyCells(board, 9);
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every(([row]) => row === 2));
  assert.equal(candidates.some(([row]) => row >= 3), false);
});

test("没有顶行支撑时整座孤岛都会下落", () => {
  const board = [
    { id: "island-1", row: 3, col: 3 },
    { id: "island-2", row: 4, col: 3 },
    { id: "island-3", row: 4, col: 4 },
  ];
  const result = splitCeilingConnected(board, 9);
  assert.equal(result.kept.length, 0);
  assert.equal(result.dropped.length, 3);
});

test("特殊连接点可以像 Unity 棋盘锚点一样支撑泡泡", () => {
  const board = [
    { id: "special-anchor", row: 5, col: 4, anchor: true },
    { id: "anchored-neighbor", row: 6, col: 4, anchor: false },
    { id: "floating", row: 8, col: 8, anchor: false },
  ];
  const result = splitCeilingConnected(board, 12, (bubble) => bubble.row === 0 || bubble.anchor);

  assert.deepEqual(result.kept.map((bubble) => bubble.id), ["special-anchor", "anchored-neighbor"]);
  assert.deepEqual(result.dropped.map((bubble) => bubble.id), ["floating"]);
});

test("触底刷行会补齐新行与下移后原棋盘的连接", () => {
  const inserted = [{ id: "new-left", row: 0, col: 1 }];
  const shifted = Array.from({ length: 13 }, (_, index) => ({
    id: `old-${index + 1}`,
    row: index + 1,
    col: 8,
  }));
  const before = splitCeilingConnected([...inserted, ...shifted], 13);
  assert.equal(before.dropped.length, shifted.length);

  const bridges = getInsertedRowBridgeCells(inserted, shifted, 1, 13)
    .map(([row, col], index) => ({ id: `bridge-${index}`, row, col }));
  const after = splitCeilingConnected([...inserted, ...bridges, ...shifted], 13);

  assert.ok(bridges.length > 0);
  assert.equal(after.dropped.length, 0);
  assert.ok(after.kept.some((cell) => cell.id === "old-13"));
});
