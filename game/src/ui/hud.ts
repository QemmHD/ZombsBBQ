import {
  CUSTOMER_BY_ID,
  DISHES,
  DISH_BY_ID,
  GUIDE_TEXT,
  HINTS,
  ITEM_BY_ID,
  PERK_IDS,
  PERK_LABEL,
  VARIANT_BY_ID,
  badges,
  buyKeepWarm,
  chairTable,
  dishAvailable,
  guideStep,
  hintEvent,
  hintTick,
  jointName,
  keepWarmCost,
  markSeen,
  maxEnergy,
  nextHint,
  perk,
  purpleStars,
  showHint,
  stars,
  stoveCooks,
  stoveTierCost,
  withLearnedVariants,
  xpToNext,
  zombieLevel,
  zombies,
  MAP_LEVEL,
  LEVEL_CAP,
  STOVE_TIERS,
  TUNING,
  activeGoals,
  upgradeStove,
  type HintId,
  type GameState,
} from '../sim';
import type { Controller } from '../game/controller';
import { sfx } from '../game/sfx';
import { applySoundscape } from '../game/soundscape';
import { tutorialIcons, tutorialKey, tutorialLine, tutorialTarget } from '../game/tutorial';
import { headUrl, artUrl } from '../scenes/assets';
import { charIdFor } from '../scenes/JointScene';
import { bindActions, energyColor, esc, fmt, fmtTime, icon, priceHtml, purpleStarsHtml, starsHtml } from './dom';
import {
  openBackups,
  openChefPicker,
  openCookbook,
  openCrew,
  openCritic,
  openFridge,
  openFryer,
  openGoals,
  openLevelUp,
  openLocker,
  openOffline,
  openRating,
  openRename,
  openSettings,
  openZombiepedia,
} from './panels';
import { openStore } from './store';
import { EditBar } from './editbar';
import { CommandStrip, WORKER_STATE } from './strip';
import { glyph } from './glyphs';
import { RaidUi, openMap, tombstoneAction, tombstoneCard, watchRoad } from './raidui';

/** The minimum a renderer needs to take a photo (Phaser's renderer.snapshot). */
interface Snapper {
  renderer: { snapshot: (cb: (img: HTMLImageElement | unknown) => void) => void };
}

/** HUD buttons that can carry the bouncing "new" marker, and the menu each one opens. */
const BADGED = ['shop', 'book', 'crew', 'pedia', 'map'] as const;

export class Hud {
  readonly root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private lastCash = -1;
  private lastSauce = -1;
  private lastClosed: boolean | null = null;
  private lastIcons = '';
  private modalClose: (() => void) | null = null;
  private pendingLevels: number[] = [];
  private pendingFryer: { streak: number; reward: string; rare?: string } | null = null;
  private pendingCritic = false;
  private levelFlashUntil = 0;
  /** the tutorial step whose bar was OK'd */
  private tutAcked: string | null = null;
  /** what the bottom bar is showing: a tutorial step (freezes the sim), a hint, or the guided purchase */
  private bar: { kind: 'tut' | 'hint' | 'guide'; key: string; until?: number } | null = null;
  private guideDismissed = '';
  /** the HUD button the tutorial or guide is pointing at with a glow */
  private glowing: HTMLElement | null = null;
  readonly edit: EditBar;
  readonly raid: RaidUi;
  readonly strip: CommandStrip;
  /** set by main.ts: the game, for the PHOTO button */
  game: Snapper | null = null;

  constructor(readonly ctl: Controller) {
    this.root = document.getElementById('hud')!;
    const sq = (k: string, label: string, ico: string, extra = '') =>
      `<button class="btn-sq" data-k="${k}" aria-label="${label}">${ico}${extra}<span class="newb" data-k="new_${k}">!</span></button>`;
    this.root.innerHTML = `
      <div class="awning" data-k="awning">
        <div class="lvl" data-k="lvl">1</div>
        <div class="joint-name"><b data-k="name" role="button" aria-label="Rename your joint">YOUR JOINT</b><span class="stars" data-k="rating" role="button" aria-label="Star rating"><span data-k="stars"></span></span></div>
        <div class="xpbar"><i data-k="xpfill"></i><span data-k="xptext"></span></div>
        <div class="cur cash" data-k="cash">${icon('ui_cash', 'cur-ico')}<span data-k="cashv"></span></div>
        <div class="cur sauce" data-k="sauce">${icon('ui_sauce', 'cur-ico')}<span data-k="saucev"></span></div>
        <button class="gear" data-k="gear" aria-label="Menu"><span class="zb">ZB</span></button>
      </div>
      <div class="side left play-only">
        <div class="hud-row">
          ${sq('shop', 'Shop', icon('ui_shop', 'bi'))}
          ${sq('goals', 'Goals', icon('ui_goals', 'bi'), '<span class="badge ready" data-k="goalc"></span>')}
          ${sq('map', 'Raid map', icon('ui_raid', 'bi'), `<span class="badge lock" data-k="maplock">${icon('fx_lock', 'ico-s')}</span>`)}
          ${sq('book', 'Cookbook', icon('ui_menu', 'bi'))}
        </div>
        <div class="hud-row">
          <button class="btn-sq crew-btn" data-k="crew" aria-label="Crew">${icon('ui_crew', 'bi')}<span class="crew-count" data-k="crewc"></span><span class="newb" data-k="new_crew">!</span></button>
          <button class="btn-sq" data-k="edit" aria-label="Storage and decorating">${icon('ui_storage', 'bi')}</button>
          <button class="btn-sq locker-btn" data-k="locker" aria-label="Meat Locker">${glyph('locker')}<span class="crew-count" data-k="lockerc"></span></button>
        </div>
      </div>
      <div class="side right play-only">
        <button class="btn-sq sign" data-k="sign" aria-label="Open or close the joint"><img class="bi" data-k="signimg" alt=""/></button>
        <button class="btn-sq" data-k="fridge" aria-label="Fridge">${icon('ui_fridge', 'bi')}<span class="badge" data-k="fridgec"></span></button>
        ${sq('pedia', 'Zombiepedia', icon('ui_zombiepedia', 'bi'))}
      </div>
      <div class="tut-veil hidden" data-k="veil"></div>
      <div class="tutbar hidden" data-k="tutbar" role="dialog" aria-live="polite"><span class="gus-badge"><img alt="" data-k="gusimg"/></span><div class="tb-text"><b data-k="tbtitle">GUS, ZOMBIE UNION REP</b><span data-k="hinttext"></span></div><button class="btn green tb-ok" data-a="tutok">OK</button></div>
      <div class="tut-arrow hidden" data-k="tutarrow" aria-hidden="true"></div>
      <div class="strip hidden play-only" data-k="strip"></div>
      <div class="editbar edit-only" data-k="editbar"></div>
      <div class="raidhud raid-only" data-k="raidhud"></div>
      <div class="toasts" data-k="toasts" role="status" aria-live="polite"></div>
      <div class="modal-root" data-k="modal"></div>
    `;
    this.root.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => (this.el[n.dataset.k!] = n));
    (this.el.gusimg as HTMLImageElement).src = headUrl('gus');
    const btn = (k: string, f: () => void) =>
      (this.el[k].onclick = (e) => {
        e.stopPropagation();
        sfx('open');
        f();
      });
    btn('gear', () => openSettings(this));
    btn('rating', () => openRating(this));
    btn('name', () => openRename(this));
    btn('shop', () => {
      markSeen(ctl.state, 'shop');
      openStore(this);
    });
    btn('book', () => this.openCookbook());
    btn('crew', () => {
      markSeen(ctl.state, 'crew');
      openCrew(this);
    });
    btn('map', () => (ctl.state.level < MAP_LEVEL ? ctl.toast(`The raid map opens at level ${MAP_LEVEL}. Keep cooking!`) : openMap(this)));
    btn('goals', () => openGoals(this));
    btn('edit', () => ctl.enterEdit());
    btn('locker', () => openLocker(this));
    btn('fridge', () => openFridge(this));
    btn('pedia', () => {
      markSeen(ctl.state, 'pedia');
      openZombiepedia(this);
    });
    btn('sign', () => ctl.toggleClosed());
    for (const k of ['tutbar', 'veil']) this.el[k].addEventListener('pointerdown', (e) => e.stopPropagation());
    bindActions(this.el.tutbar, () => this.dismissBar());
    this.strip = new CommandStrip(this, this.el.strip);
    this.edit = new EditBar(this, this.el.editbar);
    this.raid = new RaidUi(this, this.el.raidhud);
    ctl.onSelection(() => {
      // a hint or the guide steps aside for the command strip
      if (ctl.selection && this.bar && this.bar.kind !== 'tut') this.hideBar();
      this.strip.render();
      this.edit.render();
      this.syncDishPicker();
    });
    ctl.onMode((m) => {
      document.body.dataset.mode = m;
      this.closeModal();
      this.edit.render();
    });
    document.body.dataset.mode = ctl.mode;
    ctl.onToast((t) => this.showToast(t));
    ctl.onEvent((e) => {
      hintEvent(ctl.state, e);
      // never stomp another popup (e.g. raid results): queue it for the next quiet moment
      if (e.t === 'levelup') {
        this.pendingLevels.push(e.level);
        this.levelFlashUntil = performance.now() + 2500;
      }
      if (e.t === 'fryer') this.pendingFryer = e;
      if (e.t === 'toast') ctl.info(e.text);
      if (e.t === 'infected') {
        const w = ctl.state.workers.find((x) => x.id === e.workerId);
        if (w) ctl.info(`${w.name} joined the crew!`);
      }
      if (e.t === 'zombieLevel') {
        const w = ctl.state.workers.find((x) => x.id === e.workerId);
        if (w) ctl.info(`${w.name} reached level ${e.level}! More energy to burn.`);
      }
      if (e.t === 'burnt') ctl.info('Something’s BURNING! Tap the stove and SALVAGE it.');
      if (e.t === 'purple') {
        if (e.gained) this.pendingCritic = true;
        else ctl.info('Your purple stars wore off. Finish Gus’s to-do list for more!');
      }
    });
    setInterval(() => this.refresh(), 200);
    // the save wouldn't load: before anything else, offer the backups
    if (ctl.loadProblem) setTimeout(() => openBackups(this), 0);
    this.refresh();
  }

  // ---------- modals ----------
  openModal(html: string, opts: { cls?: string; onClose?: () => void; noClose?: boolean } = {}): HTMLElement {
    this.closeModal();
    // Gus's hints step aside for any menu (a tutorial step's bar stays: it's what freezes the café)
    if (this.bar && this.bar.kind !== 'tut') this.hideBar();
    const root = this.el.modal;
    root.innerHTML = `<div class="modal-bg"><div class="modal ${opts.cls ?? ''}" role="dialog" aria-modal="true">${opts.noClose ? '' : `<button class="x" data-close aria-label="Close">${icon('ui_cancel', 'x-ico')}</button>`}${html}</div></div>`;
    const bg = root.querySelector<HTMLElement>('.modal-bg')!;
    const close = () => {
      if (this.modalClose === close) this.modalClose = null;
      root.innerHTML = '';
      opts.onClose?.();
    };
    this.modalClose = close;
    root.querySelectorAll<HTMLElement>('[data-close]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx('close');
        close();
      }),
    );
    bg.addEventListener('pointerdown', (e) => e.stopPropagation());
    bg.addEventListener('click', (e) => {
      if (e.target === bg && !opts.noClose) {
        sfx('close');
        close();
      }
    });
    return root.querySelector<HTMLElement>('.modal')!;
  }

  closeModal() {
    this.modalClose?.();
  }

  get modalOpen() {
    return !!this.el.modal.innerHTML;
  }

  clearToasts() {
    this.el.toasts.innerHTML = '';
  }

  showToast(t: string) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = t;
    this.el.toasts.appendChild(d);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild!.remove();
    setTimeout(() => d.remove(), 2700);
  }

  private bump(n: HTMLElement) {
    n.classList.remove('bump');
    void n.offsetWidth;
    n.classList.add('bump');
  }

  // ---------- menus the strip opens ----------
  openCookbook() {
    markSeen(this.ctl.state, 'book');
    openCookbook(this);
  }

  openChefs() {
    openChefPicker(this);
  }

  /** PHOTO: save a picture of the joint. */
  photo() {
    const g = this.game;
    if (!g) return;
    sfx('tap');
    g.renderer.snapshot((img) => {
      const src = (img as HTMLImageElement)?.src;
      if (!src) return this.ctl.toast('The camera jammed. Try again.', false);
      const a = document.createElement('a');
      a.href = src;
      a.download = `${jointName(this.ctl.state).replace(/[^\w -]+/g, '').trim() || 'zombs-bbq'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.ctl.info('Say “brains”! Photo saved.');
    });
  }

  /** The cookbook page for an empty stove (the original's full-screen cookbook). */
  private syncDishPicker() {
    const sel = this.ctl.selection;
    if (sel?.kind !== 'dishPicker' || this.ctl.mode !== 'play') {
      if (this.el.modal.querySelector('.modal.picker')) this.closeModal();
      return;
    }
    if (this.el.modal.querySelector('.modal.picker')) return;
    const s = this.ctl.state;
    const st = s.stoves.find((x) => x.id === sel.stoveId)!;
    const w = s.workers.find((x) => x.id === sel.workerId);
    const rows = withLearnedVariants(s)
      .filter((d) => stoveCooks(st, d.station) && (d.source === 'level' || dishAvailable(s, d.id)))
      .map((d) => dishRow(d.id, s, true))
      .join('');
    const raidLocked = DISHES.filter((d) => stoveCooks(st, d.station) && d.source === 'raid' && !dishAvailable(s, d.id)).length;
    const m = this.openModal(
      `<h2>${icon('ui_menu', 'h-ico')} What should ${w?.kind === 'you' ? 'you' : w ? esc(w.name) : 'we'} cook?</h2><div class="sub">${esc(ITEM_BY_ID[s.furniture.find((f) => f.id === st.furnitureId)!.item].name)} · ${w ? '' : 'the nearest free cook goes · '}cash is paid now, the timer starts at once</div><div class="list">${rows}</div>${raidLocked ? `<p class="small">${raidLocked} more secret recipe${raidLocked > 1 ? 's' : ''} for this station can be stolen in raids.</p>` : ''}`,
      {
        cls: 'picker',
        onClose: () => {
          if (this.ctl.selection?.kind === 'dishPicker') this.ctl.select(null);
        },
      },
    );
    m.querySelectorAll<HTMLElement>('[data-dish]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        this.ctl.chooseDish(b.dataset.dish!);
      };
    });
  }

  /** INFO: the full card for whatever is selected (stats, perks, flavour, upgrades). */
  openInfo() {
    const ctl = this.ctl;
    const s = ctl.state;
    const sel = ctl.selection;
    if (!sel) return;
    let html = '';
    let onAction: ((a: string, el: HTMLElement) => void) | undefined;
    if (sel.kind === 'worker' || sel.kind === 'eatPick') {
      const w = s.workers.find((x) => x.id === (sel.kind === 'worker' ? sel.id : sel.workerId));
      if (!w) return;
      const me = maxEnergy(w);
      const def = CUSTOMER_BY_ID[w.type];
      const lv = w.kind === 'zombie' ? zombieLevel(w.xp) : 0;
      const nextXp = lv ? TUNING.zombieLevelXp[lv] : undefined;
      const perks = w.kind === 'zombie' ? PERK_IDS.filter((p) => perk(w.type, p) !== 1).map((p) => `<span class="chip perk">${PERK_LABEL[p]} +${Math.round((perk(w.type, p) - 1) * 100)}%</span>`) : [];
      html = `<div class="row"><div class="portrait"><img src="${headUrl(charIdFor(w))}" alt=""/></div><div class="grow"><h2>${esc(w.kind === 'you' ? 'YOU' : w.name)}</h2><div class="sub">${w.kind === 'you' ? 'Patient Zero · the Boss' : `${esc(def?.name ?? '')}, ex-customer`}</div>
        <div class="bar"><i style="width:${(w.energy / me) * 100}%;background:${energyColor(w.energy / me)}"></i></div><div class="state">Energy ${Math.floor(w.energy)}/${me} · ${esc(WORKER_STATE[w.state])}</div></div></div>
        ${lv ? `<div class="state">Level ${lv}${nextXp !== undefined ? ` · ${Math.floor(w.xp)}/${nextXp} XP to the next` : ' · top level'} · each level: +${Math.round(TUNING.zombieLevelEnergy * 100)}% max energy</div>` : ''}
        ${statChips(w.stats)}
        ${perks.length ? `<div class="chips">${perks.join('')}</div>` : ''}
        ${def ? `<p class="small">“${esc(def.gag)}”</p>` : '<p class="small">To cook: tap YOU, then a stove. Change your look with TRANSFORM.</p>'}`;
    } else if (sel.kind === 'customer') {
      const c = s.customers.find((x) => x.id === sel.id);
      if (!c) return;
      const def = CUSTOMER_BY_ID[c.type];
      html = `<div class="row"><div class="portrait"><img src="${headUrl(c.type)}" alt=""/></div><div class="grow"><h2>${esc(c.name ?? def.name)}</h2><div class="sub"><span class="tier ${def.tier}">${def.tier}</span> ${esc(def.name)}</div></div><div class="portrait z"><img src="${headUrl(`${c.type}_z`)}" alt=""/></div></div>
        ${statChips(def.stats, def.stats.energy)}
        <p class="small">Infected, becomes ${esc(def.zombieName)}: “${esc(def.gag)}”</p>`;
    } else if (sel.kind === 'stove') {
      const st = s.stoves.find((x) => x.id === sel.id);
      const f = st && s.furniture.find((x) => x.id === st.furnitureId);
      if (!st || !f) return;
      const tier = f.tier ?? 0;
      const up = stoveTierCost(s, st.id);
      html = `<h2>${esc(ITEM_BY_ID[f.item].name)}</h2><p class="small">${esc(ITEM_BY_ID[f.item].blurb)}</p>
        <div class="state">Tier ${tier}/${STOVE_TIERS.length}: cooks ${tier * 10}% faster, food waits ${tier * 15}% longer before it burns.</div>
        <div class="actions"><button class="btn" data-a="upgrade" ${up === null ? 'disabled' : ''}>${up === null ? 'Fully upgraded' : `Upgrade · ${priceHtml({ cash: up })}`}</button>
        ${f.keepWarm ? '' : `<button class="btn" data-a="lamp" ${s.level < 3 ? 'disabled' : ''}>Heat lamp · ${priceHtml({ cash: keepWarmCost() })}</button>`}</div>
        <p class="small">${f.keepWarm ? 'Heat lamp installed: food waits 50% longer before burning.' : `A heat lamp${s.level < 3 ? ' (level 3)' : ''} keeps finished food 50% longer.`} A dish only cooks while its cook stands at the stove.</p>`;
      onAction = (a) => {
        const e = a === 'lamp' ? buyKeepWarm(s, st.id) : a === 'upgrade' ? upgradeStove(s, st.id) : null;
        if (e) ctl.toast(e);
        else {
          sfx('purchase');
          this.openInfo();
        }
      };
    } else if (sel.kind === 'counter') {
      const slots = s.counter.filter((c) => c.dish && c.servings > 0);
      html = `<h2>Serving Counter</h2><div class="list">${
        slots.length
          ? slots.map((c) => `<div class="fridge-row"><img src="${artUrl(DISH_BY_ID[c.dish!].icon)}" alt=""/><b>${esc(DISH_BY_ID[c.dish!].name)}<br/><span class="sub">${c.servings} servings left</span></b></div>`).join('')
          : '<p>Empty! Tap a cook, then a stove, to make food.</p>'
      }</div><p class="small">Cooks carry finished food here; servers take one plate at a time to a seated customer. Dishes stack: nothing gets overwritten.</p>`;
    } else if (sel.kind === 'furniture') {
      const f = s.furniture.find((x) => x.id === sel.id);
      if (!f) return;
      const def = ITEM_BY_ID[f.item];
      let body = `<p class="small">${esc(def.blurb)}</p>`;
      if (def.payout) body += `<div class="state">${priceHtml({ cash: Math.floor(f.bank ?? 0) })} of ${priceHtml({ cash: def.payout.max })} · earns ${priceHtml({ cash: def.payout.perHour })}/hour${s.closed ? ' · paused while closed' : ''}</div>`;
      if (def.kind === 'tombstone') body += tombstoneCard(s, f);
      if (def.kind === 'table') body += `<div class="state">${f.dirty ? 'Dirty plate waiting to be cleared.' : s.furniture.some((c) => chairTable(s, c)?.id === f.id) ? 'Ready for a customer.' : 'Needs a chair facing it to seat anyone.'}</div>`;
      if (def.rating) body += `<div class="state">Star bonus: ${def.rating > 0 ? '+' : ''}${Math.round(def.rating * 100)}★</div>`;
      html = `<div class="row"><img class="card-art" src="${artUrl(def.art)}" alt=""/><div class="grow"><h2>${esc(def.name)}</h2></div></div>${body}`;
      onAction = (a) => {
        if (tombstoneAction(ctl, a, f.id)) this.openInfo();
      };
    }
    if (!html) return;
    const m = this.openModal(html, { cls: 'narrow info' });
    if (onAction) bindActions(m, onAction);
  }

  // ---------- the bottom bar: Gus's tutorial steps, hints and the guided purchase ----------
  private showBar(kind: 'tut' | 'hint' | 'guide', key: string, text: string, until?: number) {
    this.bar = { kind, key, until };
    this.el.hinttext.textContent = text;
    this.el.tutbar.classList.remove('hidden');
    this.el.tutbar.classList.toggle('freeze', kind === 'tut');
    this.el.veil.classList.toggle('hidden', kind !== 'tut');
    this.ctl.hold('tutorial', kind === 'tut');
  }

  private hideBar() {
    if (!this.bar) return;
    this.bar = null;
    this.el.tutbar.classList.add('hidden');
    this.el.veil.classList.add('hidden');
    this.ctl.hold('tutorial', false);
  }

  /** OK on Gus's bar: the tutorial step goes on (and the clock runs again), a hint goes away. */
  dismissBar() {
    const b = this.bar;
    if (!b) return;
    sfx('tap');
    if (b.kind === 'tut') {
      this.tutAcked = b.key;
      // frame the thing to touch
      const t = tutorialTarget(this.ctl.state, this.ctl.selection);
      if (t && t.t !== 'dom') this.ctl.focus({ thing: t });
    }
    if (b.kind === 'guide') this.guideDismissed = b.key;
    this.hideBar();
  }

  private refreshBar() {
    const ctl = this.ctl;
    const s = ctl.state;
    if (ctl.mode !== 'play') return this.hideBar();
    hintTick(s);
    const key = tutorialKey(s);
    if (key) {
      if (key !== this.tutAcked) {
        if (this.bar?.key !== key) this.showBar('tut', key, tutorialLine(s)!);
      } else if (this.bar?.kind === 'tut') this.hideBar();
      return;
    }
    if (this.bar?.kind === 'tut') this.hideBar();
    // hints and the guide step aside for menus and the command strip
    if (this.bar && (this.modalOpen || ctl.selection)) this.hideBar();
    // after the tutorial: the guided first table + chair, then one-shot hints
    const g = guideStep(s);
    if (g) {
      const gk = `guide:${g}`;
      if (gk !== this.guideDismissed && this.bar?.key !== gk && !this.modalOpen && !ctl.selection) this.showBar('guide', gk, GUIDE_TEXT[g]);
      return;
    }
    if (this.bar?.kind === 'guide') this.hideBar();
    if (this.bar?.kind === 'hint') {
      if (this.bar.until !== undefined && performance.now() > this.bar.until) this.hideBar();
      return;
    }
    const id: HintId | null = nextHint(s, this.modalOpen || !!ctl.selection);
    if (id) {
      showHint(s, id);
      this.showBar('hint', `hint:${id}`, HINTS[id], performance.now() + 12000);
    }
  }

  /** The tutorial's red arrow over a HUD button (world targets get the scene's arrow). */
  private refreshArrow() {
    const ctl = this.ctl;
    const a = this.el.tutarrow;
    const t = ctl.mode === 'play' ? tutorialTarget(ctl.state, ctl.selection, !!this.el.modal.querySelector('.modal.picker')) : null;
    let el: HTMLElement | null = null;
    if (t?.t === 'dom' && !this.bar) el = document.querySelector<HTMLElement>(t.sel);
    // the guided purchase points at the shop
    if (!el && !t && guideStep(ctl.state) && !this.modalOpen && ctl.mode === 'play') el = this.el.shop;
    const r = el?.getBoundingClientRect();
    // a button up in the icon column glows instead (an arrow there would sit on its neighbours)
    const glow = !!el && !!r && r.width > 0 && r.top < 90;
    if (this.glowing && this.glowing !== el) this.glowing.classList.remove('tut-glow');
    this.glowing = glow ? el : null;
    if (glow) el!.classList.add('tut-glow');
    if (!el || !r || r.width === 0 || glow) {
      a.classList.add('hidden');
      return;
    }
    a.classList.remove('hidden');
    // a wide row (a dish in the cookbook): point at its picture, not the middle of its text
    a.style.left = `${r.width > 200 ? r.left + 46 : r.left + r.width / 2}px`;
    a.style.top = `${r.top - 4}px`;
  }

  // ---------- 5 Hz refresh ----------
  /** The 5 Hz refresh, run now (tests call it so a just-reached tutorial step shows its bar at once). */
  refresh() {
    const s = this.ctl.state;
    this.el.lvl.textContent = String(s.level);
    this.el.name.textContent = jointName(s);
    // normal stars, then any purple bonus stars (only rebuilt when they change)
    const starHtml = starsHtml(stars(s)) + purpleStarsHtml(purpleStars(s));
    if (this.el.stars.innerHTML !== starHtml) this.el.stars.innerHTML = starHtml;
    const need = xpToNext(s.level);
    const max = s.level >= LEVEL_CAP;
    const flash = performance.now() < this.levelFlashUntil;
    this.el.xpfill.style.width = max || flash ? '100%' : `${Math.min(100, (s.xp / need) * 100)}%`;
    this.el.xptext.textContent = max ? 'MAX LEVEL' : flash ? 'LEVEL UP!' : `${Math.floor(s.xp)}/${need} XP`;
    if (s.cash !== this.lastCash) {
      this.el.cashv.textContent = fmt(s.cash);
      if (this.lastCash >= 0 && s.cash > this.lastCash) this.bump(this.el.cash);
      this.lastCash = s.cash;
    }
    if (s.sauce !== this.lastSauce) {
      this.el.saucev.textContent = fmt(s.sauce);
      if (this.lastSauce >= 0 && s.sauce > this.lastSauce) this.bump(this.el.sauce);
      this.lastSauce = s.sauce;
    }
    this.el.crewc.textContent = `${zombies(s).length}/${s.crewCap}`;
    const locker = s.locker;
    this.el.lockerc.textContent = locker?.zombies.length ? String(locker.zombies.length) : '';
    if (this.lastClosed !== !!s.closed) {
      this.lastClosed = !!s.closed;
      (this.el.signimg as HTMLImageElement).src = artUrl(s.closed ? 'ui_closed' : 'ui_open');
      this.el.sign.classList.toggle('closed', !!s.closed);
    }
    this.el.maplock.style.display = s.level < MAP_LEVEL ? '' : 'none';
    const ready = activeGoalsReady(s);
    this.el.goalc.textContent = ready ? String(ready) : '';
    this.el.goalc.style.display = ready ? '' : 'none';
    this.el.fridgec.textContent = s.fridge.length ? String(s.fridge.length) : '';
    this.el.fridgec.style.display = s.fridge.length ? '' : 'none';
    // the icon column fills in as the tutorial gets to each one
    const icons = tutorialIcons(s);
    const sig = [...icons].join();
    if (sig !== this.lastIcons) {
      this.lastIcons = sig;
      for (const k of ['shop', 'goals', 'map', 'book', 'crew', 'edit', 'locker', 'sign', 'fridge', 'pedia']) this.el[k].classList.toggle('gone', !icons.has(k));
    }
    // a bouncing "!" on menus with something new in them
    const b = badges(s);
    for (const k of BADGED) this.el[`new_${k}`]?.classList.toggle('on', b[k]);
    applySoundscape(s, this.ctl.mode, this.modalOpen);
    if (this.ctl.mode === 'play' && this.ctl.selection && this.ctl.selection.kind !== 'dishPicker') this.strip.render();
    if (this.ctl.mode === 'edit') this.edit.refresh();
    if (this.ctl.mode === 'raid') this.raid.refresh();
    if (this.pendingLevels.length && !this.modalOpen && this.ctl.mode !== 'raid') {
      // several levels at once (big raid haul): celebrate the highest, listing every unlock
      const lv = this.pendingLevels.splice(0);
      openLevelUp(this, Math.min(...lv), Math.max(...lv));
    }
    if (this.pendingCritic && !this.modalOpen && this.ctl.mode === 'play') {
      this.pendingCritic = false;
      openCritic(this);
    }
    if (this.pendingFryer && !this.modalOpen && this.ctl.mode === 'play') {
      openFryer(this, this.pendingFryer);
      this.pendingFryer = null;
    }
    if (this.ctl.offlineReport && !this.modalOpen && !this.ctl.loadProblem) {
      openOffline(this, this.ctl.offlineReport);
      this.ctl.offlineReport = null;
    }
    watchRoad(this, this.el.map); // a rival poaching customers: RAID badge + a one-time alert
    // last, so a popup opened just above already sends hints out of the way
    this.refreshBar();
    this.refreshArrow();
  }
}

const activeGoalsReady = (s: GameState) => activeGoals(s).filter((g) => g.done).length;

/** The stat strip on an info card: one line of compact chips (label small, number big). */
function statChips(st: { speed: number; power: number; tips: number; focus: number; patience: number }, energy?: number): string {
  const c = (k: string, v: number, title: string) => `<span class="chip" title="${title}"><i>${k}</i>${v}</span>`;
  return `<div class="chips">${c('SPD', st.speed, 'Speed')}${c('PWR', st.power, 'Power')}${c('TIPS', st.tips, 'Tips')}${c('FOC', st.focus, 'Focus')}${c('PAT', st.patience, 'Patience')}${energy !== undefined ? c('NRG', energy, 'Energy') : ''}</div>`;
}

export function dishRow(id: string, s: Controller['state'], pickable: boolean): string {
  const d = DISH_BY_ID[id];
  const avail = dishAvailable(s, id);
  const cant = pickable && s.cash < d.cost;
  const lockTxt = d.source === 'raid' ? '🔒 Steal it in a raid' : `🔒 Level ${d.level}`;
  const v = d.variant ? VARIANT_BY_ID[d.variant] : undefined;
  const tag = v ? ` <i class="var-tag v-${v.id}">${v.name.toUpperCase()}</i>` : d.source === 'raid' ? ' <i class="raid-tag">STOLEN</i>' : '';
  // Frozen and Fresh don't show in the numbers, so spell them out
  const extra = v && (v.id === 'frozen' || v.id === 'fresh') ? ` · ${v.effect}` : '';
  return `<button class="dish ${!avail || cant ? 'locked' : ''} ${v ? 'variant' : ''}" ${pickable && avail ? `data-dish="${d.id}"` : ''}>
    <span class="dish-ico"><img src="${artUrl(d.icon)}" alt=""/>${v ? `<i class="var-dot v-${v.id}">${v.name[0]}</i>` : ''}</span>
    <span><b>${esc(d.name)}${tag}</b><small>${!avail ? lockTxt : `⏱ ${fmtTime(d.cookSec)} · ${d.servings} servings · $${d.price}/serving ($${(d.price - d.cost / d.servings).toFixed(1)} profit) · +${d.xp} XP${extra}`}</small><small class="blurb">${esc(d.blurb)}</small></span>
    <span class="price">${priceHtml({ cash: d.cost })}</span></button>`;
}
