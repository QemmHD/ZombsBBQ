import Phaser from 'phaser';
import './fonts';
import './ui/style.css';
import './ui/theme3.css';
import './ui/rebuild.css';
import { Controller } from './game/controller';
import { music, unlockAudio } from './game/sfx';
import { setHaptics } from './game/haptics';
import { Hud } from './ui/hud';
import { JointScene } from './scenes/JointScene';
import { RaidScene } from './scenes/RaidScene';
import { artUrlStretch, ensureProps, ensurePropsFor, finishKeys, manageTextures, measureCrops, prewarmRaster, releaseOwner, sweepTextures, textureStats } from './scenes/assets';
import { dishIcons } from './scenes/lot';
import * as sim from './sim';
import { openFridge } from './ui/panels';

/**
 * Debug builds (`npm run dev`), or any build opened with `?debug` (the smoke, gallery and device
 * checks do this), expose `window.zbbq` and Phaser's console banner. Players get neither.
 */
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === '1' || /[?&]debug\b/.test(location.search);

performance.mark?.('zbbq:main');
const dpr = () => Math.min(3, window.devicePixelRatio || 1);

// "Reduce motion" (iOS Settings › Accessibility): no camera shakes or screen flashes in the scenes, and
// no buzzing. The CSS side is handled in style.css; this covers what Phaser draws.
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
{
  const Cam = Phaser.Cameras.Scene2D.Camera.prototype as unknown as Record<'shake' | 'flash', (...a: unknown[]) => unknown>;
  for (const fx of ['shake', 'flash'] as const) {
    const orig = Cam[fx];
    Cam[fx] = function (this: unknown, ...a: unknown[]) {
      return reduceMotion?.matches ? this : orig.apply(this, a);
    };
  }
  const sync = () => setHaptics(!reduceMotion?.matches);
  sync();
  reduceMotion?.addEventListener?.('change', sync);
}
// the HUD skin's textures come from the v3 UI art
for (const [v, k] of [
  ['--tex-awning', 'tex_awning'],
  ['--tex-chalk', 'tex_chalk'],
  ['--tex-paper', 'tex_paper'],
  ['--tex-parchment', 'tex_parchment'],
  ['--tex-brick', 'tex_brick'],
  ['--btn-olive', 'btn_olive'],
  ['--btn-red', 'btn_red'],
  ['--tex-star', 'ui_star'],
])
  document.documentElement.style.setProperty(v, `url("${artUrlStretch(k)}")`);
// shop thumbnails of wall hangings are cropped to their painted area
setTimeout(() => measureCrops([...sim.ITEMS.filter((i) => i.kind === 'wall').map((i) => `${i.art}_r`), ...sim.WALL_FINISHES.map((f) => `wall_r_${f.art}`)]), 1500);
const ctl = new Controller();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#4f5a2c',
  antialias: true,
  banner: DEBUG,
  audio: { noAudio: true }, // our own Web Audio engine handles sound
  scale: {
    mode: Phaser.Scale.NONE,
    width: window.innerWidth * dpr(),
    height: window.innerHeight * dpr(),
    zoom: 1 / dpr(),
  },
  input: { activePointers: 3 },
  scene: [],
});
game.scene.add('joint', JointScene, true, { ctl });
// free textures nobody shows any more, and redraw them all after a WebGL context loss
if (game.isBooted) manageTextures(game);
else game.events.once('ready', () => manageTextures(game));
// the raid map is a big painting: flatten it once, in the background, so the menu opens instantly
game.events.once('joint-ready', () => {
  performance.mark?.('zbbq:joint-ready');
  setTimeout(() => prewarmRaster('map_bg', 1.25), 1200);
});

function fit() {
  game.scale.resize(window.innerWidth * dpr(), window.innerHeight * dpr());
  game.scale.setZoom(1 / dpr());
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 250));

const hud = new Hud(ctl);
hud.game = game as unknown as NonNullable<Hud["game"]>;

// iOS only allows audio after a user gesture: unlock on the first tap, then start the music
const unlock = () => {
  unlockAudio();
  music(ctl.mode === 'raid' ? 'raid' : 'joint');
};
window.addEventListener('pointerup', unlock, { once: true });
window.addEventListener('touchend', unlock, { once: true });

// iOS Safari: no pinch-zooming the page itself (the café has its own pinch zoom), no long-press callouts
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ask the browser not to evict the save under storage pressure (iOS purges site data it thinks is idle)
void navigator.storage?.persist?.().catch(() => false);

// raids draw in their own scene on top of the joint (which keeps simulating underneath)
let lastMode = ctl.mode;
ctl.onMode((m) => {
  const joint = game.scene.getScene('joint');
  if (m === 'raid') {
    joint.cameras.main.setVisible(false);
    if (game.scene.getScene('raid')) game.scene.remove('raid');
    game.scene.add('raid', RaidScene, true, { ctl });
  } else {
    joint.cameras.main.setVisible(true);
    if (game.scene.getScene('raid')) {
      game.scene.remove('raid');
      // the rival's café, signs and cast: free them once the scene is really gone (removal can be queued)
      setTimeout(() => sweepTextures(game), 800);
    }
  }
  // decorating previews every wall and floor finish; once done, only the ones on the walls stay
  if (m === 'edit' && lastMode !== 'edit') void ensurePropsFor(joint, 'edit', finishKeys());
  if (m !== 'edit' && lastMode === 'edit') setTimeout(() => ctl.mode !== 'edit' && releaseOwner(game, 'edit'), 800);
  lastMode = m;
});

// dish icons follow what the café can cook (level-ups, learned recipes) and what's in the fridge
setInterval(() => {
  const joint = game.scene.getScene('joint') as JointScene | null;
  if (joint?.ready) void ensureProps(joint, dishIcons(ctl.state));
}, 1000);

// money-maker taps and fridge taps come from the scene
game.events.on('collect', (id: string) => sim.collectPayout(ctl.state, id));
game.events.on('open-fridge', () => openFridge(hud));

// handy for debugging from the console / smoke tests
if (DEBUG) (window as unknown as { zbbq: unknown }).zbbq = { ctl, game, hud, sim, textures: { stats: textureStats, sweep: (o?: Parameters<typeof sweepTextures>[1]) => sweepTextures(game, o) } };
