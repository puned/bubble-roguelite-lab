export type PositionedBubble = { row: number };

export type BoardPositionOptions = {
  rowGap: number;
  pressureDepthRows?: number;
  thresholdRow?: number;
  visibleHighRow?: number;
  invisibleAreaY?: number;
};

export function getBoardHighRow(board: PositionedBubble[]) {
  return board.length ? Math.max(...board.map((bubble) => bubble.row)) : 0;
}

export function calculateBoardOffsetY(board: PositionedBubble[], options: BoardPositionOptions) {
  const highRow = Math.max(0, getBoardHighRow(board) - Math.max(0, options.pressureDepthRows ?? 0));
  const thresholdRow = options.thresholdRow ?? 9;
  if (highRow < thresholdRow) return 0;
  const visibleHighRow = options.visibleHighRow ?? 8.1;
  return -options.rowGap * (highRow - visibleHighRow) + (options.invisibleAreaY ?? 0);
}

export function getCollapseRowForOffset(
  boardOffsetY: number,
  dangerLineY: number,
  boardOriginY: number,
  rowGap: number,
) {
  return Math.floor((dangerLineY - boardOriginY - boardOffsetY) / rowGap);
}
