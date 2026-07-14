export type GridCell = { id: string; row: number; col: number };

export function getHexRowColumnCount(row: number) {
  return row % 2 ? 10 : 11;
}

export function isValidHexCell(row: number, col: number, maxRow: number) {
  if (row < 0 || row > maxRow || col < 0) return false;
  return col < getHexRowColumnCount(row);
}

export function getHexNeighborCells(row: number, col: number, maxRow: number): Array<[number, number]> {
  const diagonal = row % 2
    ? [[-1, 0], [-1, 1], [1, 0], [1, 1]]
    : [[-1, -1], [-1, 0], [1, -1], [1, 0]];
  return [[0, -1], [0, 1], ...diagonal]
    .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
    .filter(([nextRow, nextCol]) => isValidHexCell(nextRow, nextCol, maxRow));
}

const cellKey = (row: number, col: number) => `${row}:${col}`;

export function splitCeilingConnected<T extends GridCell>(
  board: T[],
  maxRow: number,
  isAnchor: (cell: T) => boolean = (cell) => cell.row === 0,
) {
  const byCell = new Map(board.map((bubble) => [cellKey(bubble.row, bubble.col), bubble]));
  const anchored = new Set<string>();
  const queue = board.filter(isAnchor);

  while (queue.length) {
    const current = queue.shift()!;
    if (anchored.has(current.id)) continue;
    anchored.add(current.id);
    getHexNeighborCells(current.row, current.col, maxRow).forEach(([row, col]) => {
      const neighbor = byCell.get(cellKey(row, col));
      if (neighbor && !anchored.has(neighbor.id)) queue.push(neighbor);
    });
  }

  return {
    kept: board.filter((bubble) => anchored.has(bubble.id)),
    dropped: board.filter((bubble) => !anchored.has(bubble.id)),
  };
}

export function getSupportedEmptyCells(board: GridCell[], maxRow: number): Array<[number, number]> {
  const occupied = new Set(board.map((bubble) => cellKey(bubble.row, bubble.col)));
  const cells: Array<[number, number]> = [];
  for (let row = 0; row <= maxRow; row += 1) {
    for (let col = 0; col < getHexRowColumnCount(row); col += 1) {
      if (occupied.has(cellKey(row, col))) continue;
      const supported = row === 0 || getHexNeighborCells(row, col, maxRow).some(([neighborRow, neighborCol]) => occupied.has(cellKey(neighborRow, neighborCol)));
      if (supported) cells.push([row, col]);
    }
  }
  return cells;
}

export function getInsertedRowBridgeCells(
  insertedRows: GridCell[],
  shiftedBoard: GridCell[],
  insertedRowCount: number,
  maxRow: number,
): Array<[number, number]> {
  const occupied = new Set([...insertedRows, ...shiftedBoard].map((cell) => cellKey(cell.row, cell.col)));
  const bridges: Array<[number, number]> = [];
  const anchors = shiftedBoard.filter((cell) => cell.row === insertedRowCount);

  anchors.forEach((anchor) => {
    let childRow = anchor.row;
    let childCol = anchor.col;
    for (let parentRow = insertedRowCount - 1; parentRow >= 0; parentRow -= 1) {
      const parents = getHexNeighborCells(childRow, childCol, maxRow)
        .filter(([row]) => row === parentRow)
        .sort((a, b) => Math.abs(a[1] - childCol) - Math.abs(b[1] - childCol));
      const parent = parents.find(([row, col]) => occupied.has(cellKey(row, col))) ?? parents[0];
      if (!parent) break;
      const [row, col] = parent;
      const key = cellKey(row, col);
      if (!occupied.has(key)) {
        occupied.add(key);
        bridges.push([row, col]);
      }
      childRow = row;
      childCol = col;
    }
  });

  return bridges;
}
