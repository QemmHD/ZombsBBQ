/**
 * Dev tool: a sheet of every puppet pose (several frames each, plus the back view and a zombie) to check
 * the joints bend the way the original's clips do. Run `npx vite` and open /tools/poses.html?c=joe.
 */
import Phaser from 'phaser';
import { initArt, loadChar } from '../src/scenes/assets';
import { Puppet, type Pose } from '../src/scenes/puppet';

const q = new URLSearchParams(location.search);
const human = q.get('c') ?? 'joe';
const zombie = q.get('z') ?? `${human}_z`;
const ROWS: { pose: Pose; carry?: boolean; label?: string; attack?: boolean }[] = [
  { pose: 'idle' },
  { pose: 'walk' },
  { pose: 'walk', carry: true, label: 'carry' },
  { pose: 'run' },
  { pose: 'sit' },
  { pose: 'eat' },
  { pose: 'cook' },
  { pose: 'serve' },
  { pose: 'attack', attack: true },
  { pose: 'punch', attack: true },
  { pose: 'hit' },
  { pose: 'feast' },
  { pose: 'cheer' },
  { pose: 'lie' },
];
const FRAMES = 5;
const K = Number(q.get('k') ?? 1); // zoom
const only = q.get('rows')?.split(',');
const CW = 92 * K;
const CH = 132 * K;

class Sheet extends Phaser.Scene {
  async create() {
    initArt();
    await Promise.all([loadChar(this, human), loadChar(this, zombie)]);
    const { charArt } = await import('../src/scenes/assets');
    const ha = charArt(human)!;
    const za = charArt(zombie);
    ROWS.filter((r) => !only || only.includes(r.label ?? r.pose)).forEach((row, ri) => {
      const y = 20 + ri * CH + CH - 18;
      this.add.text(6, y - CH + 26, row.label ?? row.pose, { fontSize: '13px', color: '#e8dcc0' });
      const cells: { art: typeof ha; back?: boolean; z?: boolean; f: number }[] = [];
      for (let f = 0; f < FRAMES; f++) cells.push({ art: ha, f });
      cells.push({ art: ha, back: true, f: 1 });
      if (za) for (let f = 0; f < 3; f++) cells.push({ art: za, z: true, f });
      cells.forEach((cell, ci) => {
        const x = 60 + 30 * K + ci * CW;
        this.add.ellipse(x, y, 40 * K, 12 * K, 0x000000, 0.3);
        const p = new Puppet(this, cell.art);
        p.root.setPosition(x, y).setScale(K);
        p.setFacing(1, !!cell.back);
        const cycle = row.pose === 'walk' ? 1.625 / 2.2 : row.pose === 'run' ? 0.667 / 1.4 : row.pose === 'eat' ? 2.42 : row.pose === 'cook' ? 2.08 : 1.625;
        (p as unknown as { phase: number }).phase = (cell.f / FRAMES) * Math.PI * 2;
        const attackT = row.attack ? (cell.f / FRAMES) * 0.5 : undefined;
        p.pose(row.pose, 0, { zombie: cell.z, carry: row.carry, attackT, seated: row.pose === 'eat' || row.pose === 'sit' });
        void cycle;
      });
    });
    (window as unknown as { sheetReady: boolean }).sheetReady = true;
  }
}

new Phaser.Game({
  type: new URLSearchParams(location.search).has('canvas') ? Phaser.CANVAS : Phaser.WEBGL,
  width: 90 + 9 * CW,
  height: 40 + (only?.length ?? ROWS.length) * CH,
  backgroundColor: '#3a332a',
  scene: Sheet,
  render: { antialias: true, ...(q.get('mt') ? { maxTextures: Number(q.get('mt')) } : {}), ...(q.get('bs') ? { batchSize: Number(q.get('bs')) } : {}) },
});
