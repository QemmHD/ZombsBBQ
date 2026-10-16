/**
 * Isometric lot layout and pathfinding.
 *
 * Tiles are integer (gx, gy). The room covers 0..n-1 on both axes (n grows with expansions);
 * the room's top corner is tile (0,0). Back-left wall runs along gx = 0, back-right wall along
 * gy = 0 (with the door at DOOR_X). The front edges are open to the lawn, like the original,
 * where tired zombies sprawl out to rest. Behind the back-right wall: grass, sidewalk, road.
 */

export const LOT_MIN = -4;
export const DOOR_X = 5;
export const lotMax = (n: number) => n + 2;

export interface Pt {
  x: number;
  y: number;
}

export type Ground = 'floor' | 'grass' | 'sidewalk' | 'road' | 'road_line';

export function groundAt(x: number, y: number, n: number): Ground {
  if (isInside(x, y, n)) return 'floor';
  if (y === -2) return 'sidewalk';
  if (y === -3) return 'road_line';
  if (y <= -4) return 'road';
  return 'grass';
}

export function isInside(x: number, y: number, n: number): boolean {
  return x >= 0 && y >= 0 && x < n && y < n;
}

export function inLot(x: number, y: number, n: number): boolean {
  return x >= LOT_MIN && y >= LOT_MIN && x <= lotMax(n) && y <= lotMax(n);
}

/** Walls block crossing between the room and outside, except through the door and the open front. */
export function edgeBlocked(ax: number, ay: number, bx: number, by: number, n: number): boolean {
  const aIn = isInside(ax, ay, n);
  const bIn = isInside(bx, by, n);
  if (aIn === bIn) return false;
  const inside = aIn ? { x: ax, y: ay } : { x: bx, y: by };
  const outside = aIn ? { x: bx, y: by } : { x: ax, y: ay };
  if (outside.y < 0 && inside.y === 0) return inside.x !== DOOR_X; // back-right wall
  if (outside.x < 0 && inside.x === 0) return true; // back-left wall
  return false; // open front
}

export const key = (x: number, y: number) => `${x},${y}`;

const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * 4-directional A*. `blocked` holds tile keys that can't be walked through; the goal tile itself
 * is allowed even if blocked (so customers can step onto a seat). Returns the path excluding the
 * start tile, or null if unreachable.
 */
export function findPath(start: Pt, goal: Pt, blocked: Set<string>, n: number): Pt[] | null {
  const sx = Math.round(start.x);
  const sy = Math.round(start.y);
  if (sx === goal.x && sy === goal.y) return [];
  const startK = key(sx, sy);
  const goalK = key(goal.x, goal.y);
  const open: { k: string; x: number; y: number; f: number }[] = [{ k: startK, x: sx, y: sy, f: 0 }];
  const g = new Map<string, number>([[startK, 0]]);
  const came = new Map<string, string>();
  const h = (x: number, y: number) => Math.abs(x - goal.x) + Math.abs(y - goal.y);
  const closed = new Set<string>();
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.k === goalK) {
      const path: Pt[] = [];
      let k: string | undefined = goalK;
      while (k && k !== startK) {
        const [x, y] = k.split(',').map(Number);
        path.push({ x, y });
        k = came.get(k);
      }
      return path.reverse();
    }
    if (closed.has(cur.k)) continue;
    closed.add(cur.k);
    for (const [dx, dy] of DIRS4) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inLot(nx, ny, n)) continue;
      const nk = key(nx, ny);
      if (nk !== goalK && blocked.has(nk)) continue;
      if (edgeBlocked(cur.x, cur.y, nx, ny, n)) continue;
      const ng = (g.get(cur.k) ?? 0) + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, cur.k);
        open.push({ k: nk, x: nx, y: ny, f: ng + h(nx, ny) });
      }
    }
  }
  return null;
}

/** Every tile reachable from `start` (flood fill), respecting walls and blocked tiles. */
export function reachable(start: Pt, blocked: Set<string>, n: number): Set<string> {
  const seen = new Set<string>([key(start.x, start.y)]);
  const q: Pt[] = [start];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of DIRS4) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const nk = key(nx, ny);
      if (!inLot(nx, ny, n) || seen.has(nk) || blocked.has(nk) || edgeBlocked(c.x, c.y, nx, ny, n)) continue;
      seen.add(nk);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/** Iso projection: tile center → world pixels (tile width/height passed in to keep sim art-free). */
export function isoToWorld(x: number, y: number, tileW: number, tileH: number): Pt {
  return { x: (x - y) * (tileW / 2), y: (x + y) * (tileH / 2) };
}

export function worldToIso(wx: number, wy: number, tileW: number, tileH: number): Pt {
  const a = wx / (tileW / 2);
  const b = wy / (tileH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
