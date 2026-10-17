/**
 * The command strip: what the original shows when you tap someone or something in the café. A slim
 * chalkboard name plate along the bottom (who it is, a bar, one line of state) and a row of green
 * sticker buttons — only the ones that apply to this selection — then the red X. Details (stats,
 * perks, flavour, upgrades) live behind INFO.
 *
 * Replaces the big context card, which covered a third of the screen (and the tutorial's stove).
 */
import {
  CUSTOMER_BY_ID,
  DISH_BY_ID,
  ITEM_BY_ID,
  TUNING,
  attackThreshold,
  cancelCooking,
  collectPayout,
  discardCounter,
  finishCost,
  finishNow,
  fireZombie,
  infect,
  infectCost,
  lockerProblem,
  maxEnergy,
  payoutState,
  refill,
  rest,
  stoveTierCost,
  storeInLocker,
  upgradeStove,
  wake,
  zombieLevel,
  zombies,
  type Worker,
} from '../sim';
import type { Controller } from '../game/controller';
import { sfx } from '../game/sfx';
import { artUrl, headUrl } from '../scenes/assets';
import { charIdFor } from '../scenes/JointScene';
import { bindActions, energyColor, esc, fmtTime, icon } from './dom';
import { glyph } from './glyphs';
import type { Hud } from './hud';

export const WORKER_STATE: Record<Worker['state'], string> = {
  idle: 'Ready to serve',
  toStove: 'Heading to the stove',
  cooking: 'Cooking',
  toPickup: 'Fetching food from the stove',
  carryDish: 'Carrying the pot to the counter',
  toCounter: 'Grabbing food',
  carrying: 'Serving',
  toPlate: 'Clearing a dirty plate',
  carryPlate: 'Taking plates to the sink',
  hunting: 'HANGRY! Going for a customer!',
  attacking: 'ATTACKING a customer! (Rest or Energize calls them off)',
  chasing: 'Chasing down a fresh recruit!',
  serving: 'Serving: waiting by the table',
  feasting: 'Eating a customer. Gross.',
  toRest: 'Off for a nap',
  resting: 'Napping on the sidewalk… Zzz',
  daydream: 'Daydreaming about brains',
  hungry: 'HUNGRY! About to bite (Rest or Energize!)',
  asleep: 'Passed out. WORK to wake them',
  raiding: 'Out on a raid',
  down: 'Knocked out cold',
};

interface Btn {
  a: string;
  label: string;
  glyph: string;
  /** a price tag in the corner */
  tag?: string;
  disabled?: boolean;
  /** red sticker (destructive) */
  red?: boolean;
  /** extra data-* attributes */
  data?: Record<string, string>;
}

interface Plate {
  img?: string;
  name: string;
  sub: string;
  /** 0..1 and a colour, or none */
  bar?: { f: number; col: string };
  /** a little level badge on the portrait */
  lvl?: number;
}

export class CommandStrip {
  private lastStructure = '';
  private armed = '';
  private armTimer = 0;

  constructor(
    private hud: Hud,
    private el: HTMLElement,
  ) {
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  private get ctl(): Controller {
    return this.hud.ctl;
  }

  /** Two-tap confirm for destructive buttons: the first tap arms it for 3 s. */
  private arm(key: string): boolean {
    if (this.armed === key) {
      this.armed = '';
      return true;
    }
    this.armed = key;
    clearTimeout(this.armTimer);
    this.armTimer = window.setTimeout(() => {
      this.armed = '';
      this.render();
    }, 3000);
    return false;
  }

  render() {
    const ctl = this.ctl;
    const s = ctl.state;
    const sel = ctl.selection;
    const el = this.el;
    if (!sel || ctl.mode !== 'play' || sel.kind === 'dishPicker') {
      el.classList.add('hidden');
      this.hud.root.classList.remove('strip-open');
      this.lastStructure = '';
      return;
    }
    let plate: Plate | null = null;
    const btns: Btn[] = [];
    const B = (b: Btn) => btns.push(b);
    if (sel.kind === 'eatPick') {
      const w = s.workers.find((x) => x.id === sel.workerId);
      if (!w) return ctl.select(null);
      plate = { img: headUrl(charIdFor(w), 'chomp'), name: w.name, sub: 'Dinner order: tap a customer' };
    } else if (sel.kind === 'worker') {
      const w = s.workers.find((x) => x.id === sel.id);
      if (!w) return ctl.select(null);
      const me = maxEnergy(w);
      const f = w.energy / me;
      let state = WORKER_STATE[w.state];
      if (w.state === 'cooking') {
        const st = s.stoves.find((x) => x.id === w.stoveId);
        if (st?.dish) state = `COOKING ${DISH_BY_ID[st.dish].name} · ${fmtTime(st.left ?? 0)}`;
      }
      if (w.state === 'down') state = `Knocked out · back in ${fmtTime((w.downUntil ?? 0) - s.now)}`;
      const resting = w.state === 'resting' || w.state === 'toRest';
      const bitey = w.kind === 'zombie' && !resting && w.state !== 'down' && f <= attackThreshold(w.stats.patience) + 0.1;
      plate = {
        img: headUrl(charIdFor(w), w.state === 'down' ? 'dazed' : resting || w.state === 'asleep' ? 'sleep' : undefined),
        name: w.kind === 'you' ? 'YOU' : w.name,
        sub: `${bitey ? '⚠ ' : ''}${state}`,
        bar: { f, col: energyColor(f) },
        lvl: w.kind === 'zombie' ? zombieLevel(w.xp) : undefined,
      };
      const lowEnough = f < TUNING.refillBelow;
      if (w.kind === 'you') {
        B({ a: 'recipes', label: 'Recipes', glyph: 'recipes' });
        B({ a: 'chef', label: 'Transform', glyph: 'transform' });
        B({ a: 'refill', label: 'Energize', glyph: 'energize', tag: '1', disabled: !lowEnough });
        B({ a: 'info', label: 'Info', glyph: 'info' });
        B({ a: 'photo', label: 'Photo', glyph: 'photo' });
      } else if (w.state === 'down') {
        B({ a: 'refill', label: 'Revive', glyph: 'revive', tag: '1' });
        B({ a: 'info', label: 'Info', glyph: 'info' });
      } else if (w.state === 'raiding') {
        B({ a: 'info', label: 'Info', glyph: 'info' });
      } else {
        if (resting || w.state === 'daydream' || w.state === 'asleep') B({ a: 'wake', label: 'Work', glyph: 'work' });
        else B({ a: 'rest', label: 'Rest', glyph: 'rest' });
        B({ a: 'refill', label: 'Energize', glyph: 'energize', tag: '1', disabled: !lowEnough });
        if (!resting && w.state !== 'feasting') B({ a: 'eat', label: 'Attack', glyph: 'attack' });
        B({ a: 'locker', label: 'Meat Locker', glyph: 'locker', disabled: !!lockerProblem(s, w.id) });
        B({ a: 'info', label: 'Info', glyph: 'info' });
        B({ a: 'fire', label: this.armed === `fire:${w.id}` ? 'Sure?' : 'Destroy', glyph: 'destroy', red: true });
      }
    } else if (sel.kind === 'customer') {
      const c = s.customers.find((x) => x.id === sel.id);
      if (!c || !['entering', 'waiting', 'eating'].includes(c.state)) {
        if (c?.state !== 'infecting') ctl.select(null);
        return;
      }
      const def = CUSTOMER_BY_ID[c.type];
      const cost = infectCost(s, c);
      const full = zombies(s).length >= s.crewCap;
      const wait = c.state === 'waiting' ? c.waitLeft / TUNING.customerWaitSec : undefined;
      plate = {
        img: headUrl(c.type),
        name: (c.name ?? def.name).toUpperCase(),
        sub: `${def.name.toUpperCase()} · ${full ? `crew full ${s.crewCap}/${s.crewCap}` : c.state === 'eating' ? 'eating' : c.state === 'waiting' ? 'waiting for food' : 'walking in'}`,
        bar: wait !== undefined ? { f: wait, col: energyColor(wait) } : undefined,
      };
      const price = cost.cash === 0 && cost.sauce === 0 ? (s.freeInfects > 0 ? 'FREE' : '$0') : cost.sauce ? `${cost.sauce}` : `$${cost.cash}`;
      B({ a: 'infect', label: 'Infect', glyph: 'infect', tag: price, disabled: full });
      B({ a: 'info', label: 'Info', glyph: 'info' });
    } else if (sel.kind === 'stove') {
      const st = s.stoves.find((x) => x.id === sel.id);
      if (!st) return ctl.select(null);
      const f = s.furniture.find((x) => x.id === st.furnitureId)!;
      const dish = st.dish ? DISH_BY_ID[st.dish] : undefined;
      let sub = 'Empty. COOK something!';
      let bar: Plate['bar'];
      if ((st.status === 'cooking' || st.status === 'paused') && dish) {
        const p = 1 - (st.left ?? 0) / (st.total ?? dish.cookSec);
        sub = `${st.status === 'paused' ? 'PAUSED: nobody at the stove · ' : ''}${fmtTime(st.left ?? 0)}`;
        bar = { f: p, col: st.status === 'paused' ? '#8a857a' : '#c9a63a' };
      } else if (st.status === 'reserved') sub = 'The cook is on the way…';
      else if (st.status === 'done') sub = 'READY! Serve it before it burns';
      else if (st.status === 'burnt') sub = 'BURNT. Salvage the pot';
      plate = { img: dish ? artUrl(dish.icon) : artUrl(ITEM_BY_ID[f.item].art), name: (dish?.name ?? ITEM_BY_ID[f.item].name).toUpperCase(), sub, bar };
      if (st.status === 'empty') {
        B({ a: 'cook', label: 'Cook', glyph: 'cook' });
        const again = ctl.reorderDish(st.id);
        B({ a: 'order', label: again ? `Order ${DISH_BY_ID[again].name.split(' ')[0]}` : 'Order', glyph: 'order', disabled: !again });
        const up = stoveTierCost(s, st.id);
        if (up !== null) B({ a: 'upgrade', label: 'Upgrade', glyph: 'upgrade', tag: `$${up}` });
      } else if (st.status === 'cooking' || st.status === 'paused' || st.status === 'reserved') {
        if (st.status !== 'reserved') B({ a: 'finish', label: 'Finish', glyph: 'finish', tag: String(finishCost(s, st.id)) });
        B({ a: 'cancel', label: this.armed === `cancel:${st.id}` ? 'Sure?' : 'Discard', glyph: 'discard', red: true });
      } else if (st.status === 'done') B({ a: 'serve', label: 'Serve', glyph: 'serve' });
      else if (st.status === 'burnt') B({ a: 'salvage', label: 'Salvage', glyph: 'salvage' });
      B({ a: 'info', label: 'Info', glyph: 'info' });
    } else if (sel.kind === 'counter') {
      const slots = s.counter.filter((c) => c.dish && c.servings > 0);
      const total = slots.reduce((a, c) => a + c.servings, 0);
      plate = { img: artUrl(ITEM_BY_ID[s.furniture.find((f) => f.id === sel.id)?.item ?? 'counter_plain']?.art ?? ''), name: 'SERVING COUNTER', sub: total ? `${total} servings ready` : 'Empty! Cook something.' };
      for (const c of slots) B({ a: 'discard', label: `Bin ${DISH_BY_ID[c.dish!].name.split(' ')[0]} ×${c.servings}`, glyph: 'discard', red: true, data: { id: c.id } });
      B({ a: 'info', label: 'Info', glyph: 'info' });
    } else if (sel.kind === 'furniture') {
      const f = s.furniture.find((x) => x.id === sel.id);
      if (!f) return ctl.select(null);
      const def = ITEM_BY_ID[f.item];
      let sub = def.blurb;
      if (def.payout) sub = `$${Math.floor(f.bank ?? 0)} of $${def.payout.max} · $${def.payout.perHour}/hour${s.closed ? ' · paused while closed' : ''}`;
      if (def.kind === 'table') sub = f.dirty ? 'Dirty plate waiting to be cleared' : 'Table';
      plate = { img: artUrl(def.art), name: def.name.toUpperCase(), sub };
      if (def.payout && payoutState(s, f.id) !== 'none') B({ a: 'collect', label: 'Collect', glyph: 'collect' });
      if (def.kind === 'tombstone') B({ a: 'info', label: 'Upgrade', glyph: 'upgrade' });
      else B({ a: 'info', label: 'Info', glyph: 'info' });
    }
    if (!plate) return;
    const btnHtml = btns
      .map(
        (b) =>
          `<button class="sbtn${b.red ? ' red' : ''}" data-a="${b.a}"${b.disabled ? ' disabled' : ''}${Object.entries(b.data ?? {})
            .map(([k, v]) => ` data-${k}="${esc(v)}"`)
            .join('')}>${glyph(b.glyph)}<label>${esc(b.label)}</label>${b.tag ? `<i class="tag">${b.tag === 'FREE' || b.tag.startsWith('$') ? esc(b.tag) : `${icon('ui_sauce', 'tag-ico')}${esc(b.tag)}`}</i>` : ''}</button>`,
      )
      .join('');
    const bar = plate.bar ? `<div class="bar"><i data-live="bar" style="width:${Math.max(0, Math.min(1, plate.bar.f)) * 100}%;background:${plate.bar.col}"></i></div>` : '';
    const html = `<div class="plate">${plate.img ? `<span class="pp"><img src="${plate.img}" alt=""/>${plate.lvl ? `<i class="plvl">${plate.lvl}</i>` : ''}</span>` : ''}<div class="pt"><b>${esc(plate.name)}</b>${bar}<small data-live="sub">${esc(plate.sub)}</small></div></div>
      <div class="sbtns">${btnHtml}</div>
      <button class="sx" data-a="close" aria-label="Close">${glyph('close')}</button>`;
    // rebuild only when the strip's structure changes; otherwise patch the bar and state text
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const live = [...tpl.content.querySelectorAll<HTMLElement>('[data-live]')].map((n) => {
      const v = { k: n.dataset.live!, text: n.textContent ?? '', style: n.getAttribute('style') ?? '' };
      n.textContent = '';
      n.removeAttribute('style');
      return v;
    });
    const structure = `${sel.kind}:${tpl.innerHTML}`;
    this.hud.root.classList.add('strip-open');
    if (structure === this.lastStructure && !el.classList.contains('hidden')) {
      for (const v of live) {
        const n = el.querySelector<HTMLElement>(`[data-live="${v.k}"]`);
        if (!n) continue;
        if (n.textContent !== v.text) n.textContent = v.text;
        if ((n.getAttribute('style') ?? '') !== v.style) n.setAttribute('style', v.style);
      }
      return;
    }
    this.lastStructure = structure;
    el.innerHTML = html;
    el.classList.remove('hidden');
    bindActions(el, (a, b) => this.action(a, b));
  }

  private redraw() {
    this.lastStructure = '';
    this.render();
  }

  private action(a: string, el: HTMLElement) {
    const ctl = this.ctl;
    const s = ctl.state;
    const sel = ctl.selection;
    const hud = this.hud;
    const err = (e: string | null, ok?: () => void) => (e ? ctl.toast(e) : ok?.());
    if (a === 'close') {
      sfx('close');
      return ctl.select(null);
    }
    if (a === 'info') {
      sfx('open');
      return hud.openInfo();
    }
    if (sel?.kind === 'eatPick') return;
    if (sel?.kind === 'worker') {
      const w = s.workers.find((x) => x.id === sel.id);
      if (!w) return;
      switch (a) {
        case 'recipes':
          sfx('open');
          return hud.openCookbook();
        case 'chef':
          sfx('open');
          return hud.openChefs();
        case 'photo':
          return hud.photo();
        case 'rest':
          err(rest(s, w.id), () => sfx('snore', { volume: 0.6 }));
          break;
        case 'wake':
          wake(s, w.id);
          sfx('groan', { pitch: 1.1 });
          ctl.info(`${w.name} shuffles back to work.`);
          break;
        case 'refill':
          err(refill(s, w.id), () => {
            sfx('refresh');
            ctl.info(w.state === 'idle' && a === 'refill' ? 'Glug glug… ENERGY!' : 'Back on their feet!');
          });
          break;
        case 'eat':
          return ctl.beginEat(w.id);
        case 'locker':
          err(storeInLocker(s, w.id), () => {
            sfx('place');
            ctl.info(`${w.name} is hanging in the Meat Locker. A crew slot is free.`);
            ctl.select(null);
          });
          return;
        case 'fire':
          if (!this.arm(`fire:${w.id}`)) break;
          err(fireZombie(s, w.id), () => {
            ctl.info(`${w.name} lurches off into the sunset.`);
            sfx('groan', { pitch: 0.7 });
            ctl.select(null);
          });
          return;
      }
      return this.redraw();
    }
    if (sel?.kind === 'customer' && a === 'infect') {
      return err(infect(s, sel.id), () => {
        ctl.info('CHOMP! The infection spreads…');
        sfx('chomp');
        ctl.select(null);
      });
    }
    if (sel?.kind === 'stove') {
      switch (a) {
        case 'cook':
          sfx('open');
          return ctl.select({ kind: 'dishPicker', stoveId: sel.id });
        case 'order':
          return ctl.orderAgain(sel.id);
        case 'serve':
        case 'salvage':
          return ctl.tapStove(sel.id);
        case 'finish':
          err(finishNow(s, sel.id), () => sfx('ding'));
          break;
        case 'cancel':
          if (!this.arm(`cancel:${sel.id}`)) break;
          err(cancelCooking(s, sel.id), () => sfx('sell'));
          break;
        case 'upgrade':
          err(upgradeStove(s, sel.id), () => {
            sfx('purchase');
            ctl.info('Stove upgraded: it cooks faster and holds food longer.');
          });
          break;
      }
      return this.redraw();
    }
    if (sel?.kind === 'counter' && a === 'discard' && el.dataset.id) {
      err(discardCounter(s, el.dataset.id), () => sfx('burn', { volume: 0.5 }));
      return this.redraw();
    }
    if (sel?.kind === 'furniture' && a === 'collect') {
      const got = collectPayout(s, sel.id);
      if (got) sfx('cashRegister');
      return this.redraw();
    }
  }
}
