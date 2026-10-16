import Phaser from 'phaser';
import './ui/style.css';
import { Controller } from './game/controller';
import { Hud } from './ui/hud';
import { JointScene } from './scenes/JointScene';

const dpr = () => Math.min(3, window.devicePixelRatio || 1);
const ctl = new Controller();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#7cb342',
  antialias: true,
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

new Hud(ctl);
// handy for debugging from the console / smoke tests
(window as unknown as { zbbq: unknown }).zbbq = { ctl, game };
