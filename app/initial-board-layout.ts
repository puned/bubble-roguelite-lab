export type LevelDateBubble = {
  x: number;
  y: number;
  c: number;
  t: number;
};

export type LevelDateLayout = {
  bubbles: LevelDateBubble[];
};

export type ProjectedInitialCell = {
  row: number;
  col: number;
  sourceColor: number;
  sourceType: number;
};

export function parseLevelDateLayout(raw: string, label: string): LevelDateLayout {
  const parsed = JSON.parse(raw) as Partial<LevelDateLayout>;
  if (!Array.isArray(parsed.bubbles) || parsed.bubbles.length === 0) {
    throw new Error(`${label} 缺少有效 bubbles 配置`);
  }

  const bubbles = parsed.bubbles.map((bubble, index) => {
    if (!bubble
      || !Number.isInteger(bubble.x)
      || !Number.isInteger(bubble.y)
      || !Number.isInteger(bubble.c)
      || !Number.isInteger(bubble.t)) {
      throw new Error(`${label} bubbles[${index}] 坐标或类型无效`);
    }
    return bubble;
  });

  return { bubbles };
}

export function projectLevelDateLayout(layout: LevelDateLayout, maxInitialRow: number): ProjectedInitialCell[] {
  const minSourceRow = Math.min(...layout.bubbles.map((bubble) => bubble.y));
  const projected = new Map<string, ProjectedInitialCell>();

  layout.bubbles.forEach((bubble) => {
    const row = bubble.y - minSourceRow;
    if (row < 0 || row > maxInitialRow) return;

    const columnCount = row % 2 ? 10 : 11;
    if (bubble.x < 0 || bubble.x >= columnCount) return;
    projected.set(`${row}:${bubble.x}`, {
      row,
      col: bubble.x,
      sourceColor: bubble.c,
      sourceType: bubble.t,
    });
  });

  return [...projected.values()]
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

export function extendProjectedLayoutToRow(cells: ProjectedInitialCell[], maxInitialRow: number) {
  const extended = [...cells];
  let lastRow = Math.max(...extended.map((cell) => cell.row));
  if (!Number.isFinite(lastRow)) return extended;

  while (lastRow < maxInitialRow) {
    const nextRow = lastRow + 1;
    const nextColumnCount = nextRow % 2 ? 10 : 11;
    const template = extended.filter((cell) => cell.row === lastRow);
    const used = new Set<number>();
    template.forEach((cell) => {
      const col = Math.min(cell.col, nextColumnCount - 1);
      if (used.has(col)) return;
      used.add(col);
      extended.push({ ...cell, row: nextRow, col });
    });
    lastRow = nextRow;
  }

  return extended.sort((a, b) => a.row - b.row || a.col - b.col);
}

export function projectCompleteLevelDateLayout(
  layout: LevelDateLayout,
  minimumRowCount: number,
): ProjectedInitialCell[] {
  const minSourceRow = Math.min(...layout.bubbles.map((bubble) => bubble.y));
  const maxSourceRow = Math.max(...layout.bubbles.map((bubble) => bubble.y));
  const sourceMaxRow = maxSourceRow - minSourceRow;
  const requiredMaxRow = Math.max(sourceMaxRow, minimumRowCount - 1);
  return extendProjectedLayoutToRow(
    projectLevelDateLayout(layout, requiredMaxRow),
    requiredMaxRow,
  );
}
