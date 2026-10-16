import Phaser from 'phaser';
import './ui/style.css';
import { Controller } from './game/controller';
import { music, unlockAudio } from './game/sfx';
import { Hud } from './ui/hud';
import { JointScene } from './scenes/JointScene';
import { RaidScene } from './scenes/RaidScene';
import { initArt } from './scenes/assets';

const dpr = () => Math.min(3, window.devicePixelRatio || 1);
initArt();
const ctl = new Controller();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#7cb342',
  antialias: true,
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

function fit() {
  game.scale.resize(window.innerWidth * dpr(), window.innerHeight * dpr());
  game.scale.setZoom(1 / dpr());
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 250));

const hud = new Hud(ctl);

// iOS only allows audio after a user gesture: unlock on the first tap, then start the music
const unlock = () => {
  unlockAudio();
  music(ctl.mode === 'raid' ? 'raid' : 'joint');
};
window.addEventListener('pointerup', unlock, { once: true });
window.addEventListener('touchend', unlock, { once: true });

// raids draw in their own scene on top of the joint (which keeps simulating underneath)
ctl.onMode((m) => {
  const joint = game.scene.getScene('joint');
  if (m === 'raid') {
    joint.cameras.main.setVisible(false);
    if (game.scene.getScene('raid')) game.scene.remove('raid');
    game.scene.add('raid', RaidScene, true, { ctl });
  } else {
    joint.cameras.main.setVisible(true);
    if (game.scene.getScene('raid')) game.scene.remove('raid');
  }
});

// money-maker taps and fridge taps come from the scene
game.events.on('collect', (id: string) => {
  import('./sim').then(({ collectPayout }) => collectPayout(ctl.state, id));
});
game.events.on('open-fridge', () => import('./ui/panels').then(({ openFridge }) => openFridge(hud)));

// handy for debugging from the console / smoke tests
(window as unknown as { zbbq: unknown }).zbbq = { ctl, game, hud };
