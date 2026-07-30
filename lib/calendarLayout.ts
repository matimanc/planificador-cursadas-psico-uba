interface TimedItem {
  startMin: number;
  endMin: number;
}

export interface LaidOutItem<T> {
  item: T;
  col: number;
  totalCols: number;
}

/**
 * Lays out same-day items Google-Calendar style: items that overlap in time
 * are placed side by side (narrower, sharing the width) instead of stacked
 * on top of each other. Items that don't overlap anything keep full width.
 */
export function layoutDayItems<T extends TimedItem>(items: T[]): LaidOutItem<T>[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const clusters: T[][] = [];
  let current: T[] = [];
  let clusterEnd = -Infinity;

  for (const item of sorted) {
    if (current.length > 0 && item.startMin >= clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = -Infinity;
    }
    current.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (current.length > 0) clusters.push(current);

  const result: LaidOutItem<T>[] = [];

  for (const cluster of clusters) {
    const columns: T[][] = [];
    const colOfItem = new Map<T, number>();

    for (const item of cluster) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        if (col[col.length - 1].endMin <= item.startMin) {
          col.push(item);
          colOfItem.set(item, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
        colOfItem.set(item, columns.length - 1);
      }
    }

    const totalCols = columns.length;
    for (const item of cluster) {
      result.push({ item, col: colOfItem.get(item)!, totalCols });
    }
  }

  return result;
}
