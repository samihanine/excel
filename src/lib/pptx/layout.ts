const GRID = 12;

export type LayoutItem = {
  id: string;
  span: { cols: number; rows: number };
  col?: number;
  row?: number;
};

export type PlacedItem = LayoutItem & { col: number; row: number };

export type Rect = { x: number; y: number; w: number; h: number };

function fits(
  grid: boolean[][],
  col: number,
  row: number,
  cols: number,
  rows: number,
) {
  if (col < 0 || row < 0 || col + cols > GRID || row + rows > GRID)
    return false;
  for (let y = row; y < row + rows; y++) {
    for (let x = col; x < col + cols; x++) {
      if (grid[y][x]) return false;
    }
  }
  return true;
}

function occupy(
  grid: boolean[][],
  col: number,
  row: number,
  cols: number,
  rows: number,
) {
  for (let y = row; y < row + rows; y++) {
    for (let x = col; x < col + cols; x++) grid[y][x] = true;
  }
}

/**
 * Place les sections sur la grille 12×12 : `col`/`row` explicites, sinon premier
 * espace libre (parcours ligne par ligne).
 */
export function placeSections(items: LayoutItem[]): PlacedItem[] {
  const grid = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => false),
  );
  const placed: PlacedItem[] = [];

  for (const item of items) {
    const { cols, rows } = item.span;
    let col = item.col;
    let row = item.row;

    if (col !== undefined || row !== undefined) {
      if (col === undefined || row === undefined) {
        throw new Error(
          `Section « ${item.id} » : col et row doivent être fournis ensemble.`,
        );
      }
      if (!fits(grid, col, row, cols, rows)) {
        throw new Error(
          `Section « ${item.id} » : emplacement (${col},${row}) ${cols}×${rows} hors grille ou en chevauchement.`,
        );
      }
    } else {
      let found = false;
      search: for (let r = 0; r <= GRID - rows; r++) {
        for (let c = 0; c <= GRID - cols; c++) {
          if (fits(grid, c, r, cols, rows)) {
            col = c;
            row = r;
            found = true;
            break search;
          }
        }
      }
      if (!found || col === undefined || row === undefined) {
        throw new Error(
          `Section « ${item.id} » : pas d'espace libre ${cols}×${rows}. Réduis le span ou passe à la slide suivante.`,
        );
      }
    }

    occupy(grid, col, row, cols, rows);
    placed.push({ ...item, col, row });
  }

  return placed;
}

export function toRect(
  item: PlacedItem,
  slide: { width: number; height: number },
  spacing: { margin: number; gap: number },
): Rect {
  const innerW = slide.width - 2 * spacing.margin;
  const innerH = slide.height - 2 * spacing.margin;
  const cellW = (innerW - spacing.gap * (GRID - 1)) / GRID;
  const cellH = (innerH - spacing.gap * (GRID - 1)) / GRID;
  return {
    x: spacing.margin + item.col * (cellW + spacing.gap),
    y: spacing.margin + item.row * (cellH + spacing.gap),
    w: item.span.cols * cellW + (item.span.cols - 1) * spacing.gap,
    h: item.span.rows * cellH + (item.span.rows - 1) * spacing.gap,
  };
}
