export interface IndexRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/*
 * Uniform-grid spatial index over node rectangles.
 *
 * Edge routing has to know which nodes can block an edge. Scanning every node
 * for every edge makes a full re-route O(nodes x edges); with the grid an edge
 * only looks at nodes in the few cells around its endpoints.
 *
 * Results are a superset of the nodes that actually overlap the query bounds
 * (whole cells are returned). That is intentional: callers run an exact
 * intersection test afterwards, so extra candidates cost a little time but
 * never change the outcome.
 */
export interface ObstacleIndex {
  /** Padded rects of nodes near `bounds`, skipping the two given node ids. */
  query(bounds: IndexRect, excludeA: string, excludeB: string): IndexRect[];

  /** Padded rects of every node, skipping the two given node ids. */
  all(excludeA: string, excludeB: string): IndexRect[];
}

const CELL_SIZE = 256;

// Cell coordinates are shifted so that negative layouts map to positive keys.
const CELL_OFFSET = 1 << 20;
const CELL_STRIDE = 1 << 22;

function cellKey(cellX: number, cellY: number): number {
  return (cellX + CELL_OFFSET) * CELL_STRIDE + (cellY + CELL_OFFSET);
}

function padRect(rect: IndexRect, padding: number): IndexRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function createObstacleIndex(
  layout: Record<string, IndexRect>,
  padding: number,
): ObstacleIndex {
  const ids = Object.keys(layout);
  const padded: IndexRect[] = new Array(ids.length);
  const cells = new Map<number, number[]>();

  for (let index = 0; index < ids.length; index += 1) {
    const rect = layout[ids[index]!]!;

    padded[index] = padRect(rect, padding);

    const firstX = Math.floor(rect.x / CELL_SIZE);
    const lastX = Math.floor((rect.x + rect.width) / CELL_SIZE);
    const firstY = Math.floor(rect.y / CELL_SIZE);
    const lastY = Math.floor((rect.y + rect.height) / CELL_SIZE);

    for (let cellX = firstX; cellX <= lastX; cellX += 1) {
      for (let cellY = firstY; cellY <= lastY; cellY += 1) {
        const key = cellKey(cellX, cellY);
        const bucket = cells.get(key);

        if (bucket) {
          bucket.push(index);
        } else {
          cells.set(key, [index]);
        }
      }
    }
  }

  return {
    query(bounds, excludeA, excludeB) {
      const seen = new Set<number>();
      const result: IndexRect[] = [];

      const firstX = Math.floor(bounds.x / CELL_SIZE);
      const lastX = Math.floor((bounds.x + bounds.width) / CELL_SIZE);
      const firstY = Math.floor(bounds.y / CELL_SIZE);
      const lastY = Math.floor((bounds.y + bounds.height) / CELL_SIZE);

      for (let cellX = firstX; cellX <= lastX; cellX += 1) {
        for (let cellY = firstY; cellY <= lastY; cellY += 1) {
          const bucket = cells.get(cellKey(cellX, cellY));

          if (!bucket) {
            continue;
          }

          for (const index of bucket) {
            if (seen.has(index)) {
              continue;
            }

            seen.add(index);

            const id = ids[index]!;

            if (id !== excludeA && id !== excludeB) {
              result.push(padded[index]!);
            }
          }
        }
      }

      return result;
    },

    all(excludeA, excludeB) {
      const result: IndexRect[] = [];

      for (let index = 0; index < ids.length; index += 1) {
        const id = ids[index]!;

        if (id !== excludeA && id !== excludeB) {
          result.push(padded[index]!);
        }
      }

      return result;
    },
  };
}
