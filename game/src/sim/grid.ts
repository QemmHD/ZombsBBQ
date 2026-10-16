/**
 * Isometric lot layout and pathfinding.
 *
 * Tiles are integer (gx, gy). The room covers 0..ROOM_N-1 on both axes; the room's top
 * corner is tile (0,0). Back-left wall runs along gx = 0, back-right wall along gy = 0
 * (with the door at DOOR_X). The front edges are open to the lawn, like the original,
 * where tired zombies sprawl out to rest. Behind the back-right wall: grass, sidewalk, road.
 */

export const ROOM_N = 8;
export const LOT_MIN = -4;
export const LOT_MAX = ROOM_N + 2;
export const DOOR_X = 5;

export interface Pt {
  x: number;
  y: number;
}

export type Ground = 'floor' | 'grass' | 'sidewalk' | 'road' | 'road_line';

export function groundAt(x: number, y: number): Ground {
  if (isInside(x, y)) return 'floor';
  if (y === -2) return 'sidewalk';
  if (y === -3) return 'road_line';
  if (y <= -4) return 'road';
  return 'grass';
}

export function isInside(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < ROOM_N && y < ROOM_N;
}

export function inLot(x: number, y: number): boolean {
  return x >= LOT_MIN && y >= LOT_MIN && x <= LOT_MAX && y <= LOT_MAX;
}

/** Walls block crossing between the room and outside, except through the door and the open front. */
export function edgeBlocked(ax: number, ay: number, bx: number, by: number): boolean {
  const aIn = isInside(ax, ay);
  const bIn = isInside(bx, by);
  if (aIn === bIn) return false;
  const inside = aIn ? { x: ax, y: ay } : { x: bx, y: by };
  const outside = aIn ? { x: bx, y: by } : { x: ax, y: ay };
  if (outside.y < 0 && inside.y === 0) return inside.x !== DOOR_X; // back-right wall
  if (outside.x < 0 && inside.x === 0) return true; // back-left wall
  return false; // open front
}

export const key = (x: number, y: number) => `${x},${y}`;

/**
 * 4-directional A*. `blocked` holds tile keys that can't be walked through; the goal tile itself
 * is allowed even if blocked (so customers can step onto a bench seat). Returns the path
 * excluding the start tile, or null if unreachable.
 */
export function findPath(start: Pt, goal: Pt, blocked: Set<string>): Pt[] | null {
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
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inLot(nx, ny)) continue;
      const nk = key(nx, ny);
      if (nk !== goalK && blocked.has(nk)) continue;
      if (edgeBlocked(cur.x, cur.y, nx, ny)) continue;
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

/** Iso projection: tile center → world pixels (tile width/height passed in to keep sim art-free). */
export function isoToWorld(x: number, y: number, tileW: number, tileH: number): Pt {
  return { x: (x - y) * (tileW / 2), y: (x + y) * (tileH / 2) };
}

export function worldToIso(wx: number, wy: number, tileW: number, tileH: number): Pt {
  const a = wx / (tileW / 2);
  const b = wy / (tileH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
