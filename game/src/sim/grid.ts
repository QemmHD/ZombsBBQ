/**
 * The lot (v3): the café sits on the corner of a crossroads, like the original.
 *
 * Tiles are integer (gx, gy). The room covers 0 ≤ x < w, 0 ≤ y < h and grows toward the front when
 * expanded. Its two back walls run along y = 0 (north-east wall, with the door at DOOR_X) and x = 0
 * (north-west wall). Behind EACH back wall: a sidewalk (row/column -1), a two-lane road (-2, -3) and a
 * far sidewalk (-4); grass beyond and on the front lawn. Customers walk the near sidewalks and come in
 * through the door; tired zombies walk out the door and rest on the sidewalk. The room is otherwise
 * closed: nobody walks through walls or across the lawn.
 */

export const DOOR_X = 4;

export interface Pt {
  x: number;
  y: number;
}

export interface Room {
  w: number;
  h: number;
}

export type Ground = 'floor' | 'grass' | 'sidewalk' | 'road';

export const isRoad = (x: number, y: number) => x === -2 || x === -3 || y === -2 || y === -3;
export const isSidewalk = (x: number, y: number) => !isRoad(x, y) && (x === -1 || x === -4 || y === -1 || y === -4);

export function isInside(x: number, y: number, r: Room): boolean {
  return x >= 0 && y >= 0 && x < r.w && y < r.h;
}

export function groundAt(x: number, y: number, r: Room): Ground {
  if (isRoad(x, y)) return 'road';
  if (isSidewalk(x, y)) return 'sidewalk';
  if (isInside(x, y, r)) return 'floor';
  return 'grass';
}

/** How far the near sidewalks run past the room (where customers appear and disappear). */
export const STREET_RUN = 5;

/** Tiles people can walk on: the room and the two near sidewalks. */
export function walkable(x: number, y: number, r: Room): boolean {
  if (isInside(x, y, r)) return true;
  if (y === -1 && x >= -1 && x <= r.w + STREET_RUN) return true;
  if (x === -1 && y >= -1 && y <= r.h + STREET_RUN) return true;
  return false;
}

/** The front lawn, where outdoor items (tombstones, pet houses) go. */
export function onLawn(x: number, y: number, r: Room): boolean {
  return x >= 0 && y >= 0 && !isInside(x, y, r) && x <= r.w + 3 && y <= r.h + 3;
}

/** Walls block crossing between the room and outside, except through the door. */
export function edgeBlocked(ax: number, ay: number, bx: number, by: number, r: Room): boolean {
  const aIn = isInside(ax, ay, r);
  const bIn = isInside(bx, by, r);
  if (aIn === bIn) return false;
  const inside = aIn ? { x: ax, y: ay } : { x: bx, y: by };
  const outside = aIn ? { x: bx, y: by } : { x: ax, y: ay };
  return !(inside.x === DOOR_X && inside.y === 0 && outside.x === DOOR_X && outside.y === -1);
}

export const key = (x: number, y: number) => `${x},${y}`;

/** Where customers come from and go back to: the far ends of both near sidewalks. */
export function streetEnds(r: Room): Pt[] {
  return [
    { x: r.w + STREET_RUN, y: -1 },
    { x: -1, y: r.h + STREET_RUN },
  ];
}

/** Sidewalk spots where tired zombies lie down. First the stretch just past the end of the door's
 * wall (outside, but in plain view so you can tap them), then past the other wall, then the rest. */
export function restSpots(r: Room): Pt[] {
  const out: Pt[] = [];
  for (let x = r.w; x < r.w + STREET_RUN; x++) out.push({ x, y: -1 });
  for (let y = r.h; y < r.h + STREET_RUN; y++) out.push({ x: -1, y });
  for (let d = 1; d <= r.w; d++) for (const x of [DOOR_X - d, DOOR_X + d]) if (x >= -1 && x < r.w) out.push({ x, y: -1 });
  for (let y = 0; y < r.h; y++) out.push({ x: -1, y });
  return out;
}

const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * 4-directional A*. `blocked` holds tile keys that can't be walked through; the goal tile itself is
 * allowed even if blocked (so customers can step onto a chair). Returns the path excluding the start
 * tile, or null if unreachable.
 */
export function findPath(start: Pt, goal: Pt, blocked: Set<string>, r: Room): Pt[] | null {
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
      const nk = key(nx, ny);
      if (nk !== goalK && (!walkable(nx, ny, r) || blocked.has(nk))) continue;
      if (nk === goalK && !walkable(nx, ny, r)) continue;
      if (edgeBlocked(cur.x, cur.y, nx, ny, r)) continue;
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

/** Every walkable tile reachable from `start` (flood fill), respecting walls and blocked tiles. */
export function reachable(start: Pt, blocked: Set<string>, r: Room): Set<string> {
  const seen = new Set<string>([key(start.x, start.y)]);
  const q: Pt[] = [start];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of DIRS4) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const nk = key(nx, ny);
      if (seen.has(nk) || !walkable(nx, ny, r) || blocked.has(nk) || edgeBlocked(c.x, c.y, nx, ny, r)) continue;
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
