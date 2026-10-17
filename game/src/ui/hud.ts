import {
  CUSTOMER_BY_ID,
  DISHES,
  DISH_BY_ID,
  ITEM_BY_ID,
  VARIANT_BY_ID,
  purpleStars,
  withLearnedVariants,
  MAP_LEVEL,
  TUTORIAL,
  TUNING,
  activeGoals,
  chairTable,
  attackThreshold,
  buyKeepWarm,
  cancelCooking,
  discardCounter,
  finishCost,
  finishNow,
  collectPayout,
  dishAvailable,
  fireZombie,
  infect,
  infectCost,
  keepWarmCost,
  stoveTierCost,
  upgradeStove,
  STOVE_TIERS,
  refill,
  rest,
  stars,
  stoveCooks,
  wake,
  xpToNext,
  zombies,
  LEVEL_CAP,
  maxEnergy,
  payoutState,
  type Worker,
} from '../sim';
import type { Controller } from '../game/controller';
import { sfx } from '../game/sfx';
import { headUrl, artUrl } from '../scenes/assets';
import { charIdFor } from '../scenes/JointScene';
import { bindActions, energyColor, esc, fmt, fmtTime, icon, priceHtml, purpleStarsHtml, starsHtml } from './dom';
import { openCookbook, openCrew, openFridge, openFryer, openGoals, openLevelUp, openOffline, openRating, openSettings, openZombiepedia } from './panels';
import { openStore } from './store';
import { EditBar } from './editbar';
import { RaidUi, openMap, tombstoneAction, tombstoneCard, watchRoad } from './raidui';

const WORKER_STATE: Record<Worker['state'], string> = {
  idle: 'Ready to serve',
  toStove: 'Heading to the stove',
  cooking: 'Cooking',
  toPickup: 'Fetching food from the stove',
  carryDish: 'Carrying the pot to the counter',
  toCounter: 'Grabbing food',
  carrying: 'Serving a customer',
  toPlate: 'Clearing a dirty plate',
  carryPlate: 'Taking plates to the sink',
  hunting: 'HANGRY! Going for a customer!',
  feasting: 'Eating a customer. Gross.',
  toRest: 'Off for a nap',
  resting: 'Napping on the sidewalk… Zzz',
  daydream: 'Daydreaming about brains… (tap to snap out of it)',
  hungry: 'HUNGRY! About to go for a customer… (Rest or Refill to calm them)',
  asleep: 'Passed out face-down, out of energy. Tap to wake, or Rest / Refill',
  raiding: 'Out on a raid',
  down: 'Knocked out cold. Reanimating…',
};

export class Hud {
  readonly root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private lastCash = -1;
  private lastSauce = -1;
  private lastTut = -1;
  private lastClosed: boolean | null = null;
  private lastStructure = '';
  private fireArmed = '';
  private cancelArmed = '';
  private modalClose: (() => void) | null = null;
  private pendingLevels: number[] = [];
  private pendingFryer: { streak: number; reward: string; rare?: string } | null = null;
  readonly edit: EditBar;
  readonly raid: RaidUi;

  constructor(readonly ctl: Controller) {
    this.root = document.getElementById('hud')!;
    this.root.innerHTML = `
      <div class="awning" data-k="awning">
        <div class="lvl" data-k="lvl">1</div>
        <div class="joint-name" data-k="rating" role="button" aria-label="Star rating"><b>YOUR JOINT</b><span class="stars" data-k="stars"></span></div>
        <div class="xpbar"><i data-k="xpfill"></i><span data-k="xptext"></span></div>
        <div class="cur cash" data-k="cash">${icon('ui_cash', 'cur-ico')}<span data-k="cashv"></span></div>
        <div class="cur sauce" data-k="sauce">${icon('ui_sauce', 'cur-ico')}<span data-k="saucev"></span></div>
        <button class="gear" data-k="gear" aria-label="Settings">${icon('ui_settings', 'gear-ico')}</button>
      </div>
      <div class="side left grid3 play-only">
        <button class="btn-sq" data-k="shop" aria-label="Shop">${icon('ui_shop', 'bi')}<label>SHOP</label></button>
        <button class="btn-sq" data-k="book" aria-label="Cookbook">${icon('ui_menu', 'bi')}<label>MENU</label></button>
        <button class="btn-sq" data-k="map" aria-label="Raid map">${icon('ui_raid', 'bi')}<label>RAID</label><span class="badge lock" data-k="maplock">${icon('fx_lock', 'ico-s')}</span></button>
        <button class="btn-sq" data-k="crew" aria-label="Crew">${icon('ui_crew', 'bi')}<label>CREW</label><span class="badge" data-k="crewc"></span></button>
        <button class="btn-sq" data-k="goals" aria-label="Goals">${icon('ui_goals', 'bi')}<label>GOALS</label><span class="badge ready" data-k="goalc"></span></button>
        <button class="btn-sq" data-k="edit" aria-label="Decorate">${icon('ui_edit', 'bi')}<label>DECOR</label></button>
      </div>
      <div class="side right play-only">
        <button class="btn-sq sign" data-k="sign" aria-label="Open or close the joint"><img class="bi" data-k="signimg" alt=""/><label data-k="signlbl">OPEN</label></button>
        <button class="btn-sq" data-k="fridge" aria-label="Fridge">${icon('ui_fridge', 'bi')}<label>FRIDGE</label><span class="badge" data-k="fridgec"></span></button>
        <button class="btn-sq" data-k="pedia" aria-label="Zombiepedia">${icon('ui_zombiepedia', 'bi')}<label>ZOMBS</label></button>
      </div>
      <div class="hint hidden play-only" data-k="hint"><img alt="" data-k="gusimg"/><div class="bubble"><b>GUS, ZOMBIE UNION REP</b><span data-k="hinttext"></span></div></div>
      <div class="card hidden play-only" data-k="card"></div>
      <div class="editbar edit-only" data-k="editbar"></div>
      <div class="raidhud raid-only" data-k="raidhud"></div>
      <div class="toasts" data-k="toasts"></div>
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
    btn('shop', () => openStore(this));
    btn('book', () => openCookbook(this));
    btn('crew', () => openCrew(this));
    btn('map', () => (ctl.state.level < MAP_LEVEL ? ctl.toast(`The raid map opens at level ${MAP_LEVEL}. Keep cooking!`) : openMap(this)));
    btn('goals', () => openGoals(this));
    btn('edit', () => ctl.enterEdit());
    btn('fridge', () => openFridge(this));
    btn('pedia', () => openZombiepedia(this));
    btn('sign', () => ctl.toggleClosed());
    this.el.card.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.edit = new EditBar(this, this.el.editbar);
    this.raid = new RaidUi(this, this.el.raidhud);
    ctl.onSelection(() => {
      this.renderCard();
      this.edit.render();
    });
    ctl.onMode((m) => {
      document.body.dataset.mode = m;
      this.closeModal();
      this.edit.render();
    });
    document.body.dataset.mode = ctl.mode;
    ctl.onToast((t) => this.showToast(t));
    ctl.onEvent((e) => {
      // never stomp another popup (e.g. raid results): queue it for the next quiet moment
      if (e.t === 'levelup') this.pendingLevels.push(e.level);
      if (e.t === 'fryer') this.pendingFryer = e;
      if (e.t === 'toast') ctl.info(e.text);
      if (e.t === 'infected') {
        const w = ctl.state.workers.find((x) => x.id === e.workerId);
        if (w) ctl.info(`${w.name} joined the crew!`);
      }
      if (e.t === 'burnt') ctl.info('Something’s BURNING! Tap it to scrape it off.');
      if (e.t === 'purple') ctl.info(e.gained ? `The food critic came by! Purple star ${e.stars}/3: more customers, bigger tips.` : 'Your purple stars wore off. Finish Gus’s to-do list for more!');
    });
    setInterval(() => this.refresh(), 200);
    this.refresh();
  }

  // ---------- modals ----------
  openModal(html: string, opts: { cls?: string; onClose?: () => void; noClose?: boolean } = {}): HTMLElement {
    this.closeModal();
    const root = this.el.modal;
    root.innerHTML = `<div class="modal-bg"><div class="modal ${opts.cls ?? ''}">${opts.noClose ? '' : `<button class="x" data-close aria-label="Close">${icon('ui_cancel', 'x-ico')}</button>`}${html}</div></div>`;
    const bg = root.querySelector<HTMLElement>('.modal-bg')!;
    const close = () => {
      if (this.modalClose === close) this.modalClose = null;
      root.innerHTML = '';
      opts.onClose?.();
    };
    this.modalClose = close;
    root.querySelector<HTMLElement>('[data-close]')?.addEventListener('click', () => {
      sfx('close');
      close();
    });
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

  // ---------- 5 Hz refresh ----------
  private refresh() {
    const s = this.ctl.state;
    this.el.lvl.textContent = String(s.level);
    // normal stars, then any purple bonus stars (only rebuilt when they change)
    const starHtml = starsHtml(stars(s)) + purpleStarsHtml(purpleStars(s));
    if (this.el.stars.innerHTML !== starHtml) this.el.stars.innerHTML = starHtml;
    const need = xpToNext(s.level);
    const max = s.level >= LEVEL_CAP;
    this.el.xpfill.style.width = max ? '100%' : `${Math.min(100, (s.xp / need) * 100)}%`;
    this.el.xptext.textContent = max ? 'MAX LEVEL' : `${Math.floor(s.xp)}/${need} XP`;
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
    if (this.lastClosed !== !!s.closed) {
      this.lastClosed = !!s.closed;
      (this.el.signimg as HTMLImageElement).src = artUrl(s.closed ? 'ui_closed' : 'ui_open');
      this.el.signlbl.textContent = s.closed ? 'CLOSED' : 'OPEN';
      this.el.sign.classList.toggle('closed', !!s.closed);
    }
    this.el.maplock.style.display = s.level < MAP_LEVEL ? '' : 'none';
    const ready = activeGoals(s).filter((g) => g.done).length;
    this.el.goalc.textContent = ready ? String(ready) : '';
    this.el.goalc.style.display = ready ? '' : 'none';
    this.el.fridgec.textContent = s.fridge.length ? String(s.fridge.length) : '';
    this.el.fridgec.style.display = s.fridge.length ? '' : 'none';
    if (s.tut !== this.lastTut) {
      this.lastTut = s.tut;
      const text = TUTORIAL[s.tut];
      this.el.hint.classList.toggle('hidden', !text);
      if (text) this.el.hinttext.textContent = text;
    }
    if (this.ctl.mode === 'play' && this.ctl.selection && this.ctl.selection.kind !== 'dishPicker') this.renderCard();
    if (this.ctl.mode === 'edit') this.edit.refresh();
    if (this.ctl.mode === 'raid') this.raid.refresh();
    if (this.pendingLevels.length && !this.modalOpen && this.ctl.mode !== 'raid') {
      // several levels at once (big raid haul): celebrate the highest, listing every unlock
      const lv = this.pendingLevels.splice(0);
      openLevelUp(this, Math.min(...lv), Math.max(...lv));
    }
    if (this.pendingFryer && !this.modalOpen && this.ctl.mode === 'play') {
      openFryer(this, this.pendingFryer);
      this.pendingFryer = null;
    }
    if (this.ctl.offlineReport && !this.modalOpen) {
      openOffline(this, this.ctl.offlineReport);
      this.ctl.offlineReport = null;
    }
    watchRoad(this, this.el.map); // a rival poaching customers: RAID badge + a one-time alert
  }

  // ---------- context card ----------
  renderCard() {
    const s = this.ctl.state;
    const sel = this.ctl.selection;
    const card = this.el.card;
    if (!sel || this.ctl.mode !== 'play') {
      card.classList.add('hidden');
      this.root.classList.remove('card-open');
      this.lastStructure = '';
      return;
    }
    let html = '';
    if (sel.kind === 'worker') {
      const w = s.workers.find((x) => x.id === sel.id);
      if (!w) return this.ctl.select(null);
      const me = maxEnergy(w);
      const f = w.energy / me;
      let state = WORKER_STATE[w.state];
      if (w.state === 'cooking') {
        const st = s.stoves.find((x) => x.id === w.stoveId);
        if (st?.dish) state = `Cooking ${DISH_BY_ID[st.dish].name} · ${fmtTime(st.left ?? 0)}`;
      }
      if (w.state === 'down') state = `Knocked out cold · back in ${fmtTime((w.downUntil ?? 0) - s.now)}`;
      const resting = w.state === 'resting' || w.state === 'toRest';
      const warn = w.kind === 'zombie' && !resting && w.state !== 'down' && f <= attackThreshold(w.stats.patience) + 0.1 ? ' ⚠️ about to bite!' : '';
      const def = CUSTOMER_BY_ID[w.type];
      const armed = this.fireArmed === w.id;
      html = `
        <div class="row"><div class="portrait"><img src="${headUrl(charIdFor(w), w.state === 'down' ? 'dazed' : resting ? 'sleep' : undefined)}" alt=""/></div>
        <div class="grow"><h3>${esc(w.name)}</h3><div class="sub">${w.kind === 'you' ? 'Patient Zero · the Boss' : `${esc(def.name)}, ex-customer`}</div>
        <div class="bar"><i data-live="ebar" style="width:${f * 100}%;background:${energyColor(f)}"></i></div>
        <div class="state" data-live="etext">Energy ${Math.floor(w.energy)}/${me}${warn}</div></div></div>
        <div class="state" data-live="state">${state}</div>
        <div class="chips"><span class="chip">SPD ${w.stats.speed}</span><span class="chip">PWR ${w.stats.power}</span><span class="chip">TIPS ${w.stats.tips}</span><span class="chip">FOCUS ${w.stats.focus}</span><span class="chip">PATIENCE ${w.stats.patience}</span></div>
        <div class="actions">
          ${w.state === 'down' ? '' : resting ? `<button class="btn blue" data-a="wake">Back to work</button>` : `<button class="btn blue" data-a="rest" ${w.state === 'cooking' || w.state === 'raiding' ? 'disabled' : ''}>Rest</button>`}
          <button class="btn sauce" data-a="refill" ${f >= 1 && w.state !== 'down' ? 'disabled' : ''}>${w.state === 'down' ? 'Revive' : 'Refill'} ${icon('ui_sauce', 'ico-s')}1</button>
          ${w.kind === 'zombie' ? `<button class="btn red small-btn" data-a="fire">${armed ? 'Sure?' : 'Fire'}</button>` : ''}
        </div>
        <div class="small">${w.kind === 'zombie' && def ? `“${esc(def.gag)}” · ` : ''}To cook: tap a stove now.</div>`;
    } else if (sel.kind === 'customer') {
      const c = s.customers.find((x) => x.id === sel.id);
      if (!c || !['entering', 'waiting', 'eating'].includes(c.state)) {
        if (c?.state !== 'infecting') this.ctl.select(null);
        return;
      }
      const def = CUSTOMER_BY_ID[c.type];
      const cost = infectCost(s, c);
      const costTxt = cost.cash === 0 && cost.sauce === 0 ? 'FREE' : priceHtml(cost);
      const full = zombies(s).length >= s.crewCap;
      html = `
        <div class="row"><div class="portrait"><img src="${headUrl(c.type)}" alt=""/></div>
        <div class="grow"><h3>${esc(def.name)}</h3><div class="sub"><span class="tier ${def.tier}">${def.tier}</span> ${c.state === 'eating' ? 'Chowing down' : c.state === 'waiting' ? 'Waiting for food' : 'Walking in'}</div>
        ${c.state === 'waiting' ? `<div class="bar"><i data-live="wait" style="width:${(c.waitLeft / TUNING.customerWaitSec) * 100}%;background:${energyColor(c.waitLeft / TUNING.customerWaitSec)}"></i></div>` : ''}</div>
        <div class="portrait z"><img src="${headUrl(`${c.type}_z`)}" alt=""/></div></div>
        <div class="chips"><span class="chip">SPD ${def.stats.speed}</span><span class="chip">PWR ${def.stats.power}</span><span class="chip">TIPS ${def.stats.tips}</span><span class="chip">FOCUS ${def.stats.focus}</span><span class="chip">PATIENCE ${def.stats.patience}</span><span class="chip">NRG ${def.stats.energy}</span></div>
        <div class="actions"><button class="btn infect" data-a="infect" ${full ? 'disabled' : ''}>INFECT · ${costTxt}</button></div>
        <div class="small">${full ? `Crew full (${s.crewCap}/${s.crewCap}). Fire someone or level up.` : `Becomes ${esc(def.zombieName)}: “${esc(def.gag)}”`}</div>`;
    } else if (sel.kind === 'stove') {
      const st = s.stoves.find((x) => x.id === sel.id);
      if (!st) return this.ctl.select(null);
      const f = s.furniture.find((x) => x.id === st.furnitureId)!;
      const name = ITEM_BY_ID[f.item].name;
      let body = '';
      if ((st.status === 'cooking' || st.status === 'paused') && st.dish) {
        const d = DISH_BY_ID[st.dish];
        const p = 1 - (st.left ?? 0) / (st.total ?? d.cookSec);
        const paused = st.status === 'paused';
        body = `<div class="state" data-live="cook">${paused ? 'PAUSED: nobody at the stove' : 'Cooking'} ${d.name} · ${fmtTime(st.left ?? 0)} left</div><div class="bar"><i data-live="cbar" style="width:${p * 100}%;background:${paused ? '#8a857a' : '#c9a63a'}"></i></div>
          ${paused ? '<div class="small">A dish only cooks while its cook stands at the stove. Tap a cook, then this stove.</div>' : ''}
          <div class="actions"><button class="btn sauce" data-a="finish">Finish now · ${icon('ui_sauce', 'ico-s')} <span data-live="fcost">${finishCost(s, st.id)}</span></button><button class="btn red small-btn" data-a="cancel">${this.cancelArmed === st.id ? 'Tap again' : 'Cancel'}</button></div><div class="small">Cancel gives back half the ingredients money.</div>`;
      } else if (st.status === 'reserved') body = `<div class="state">The cook is on the way…</div>`;
      else body = `<div class="state">Empty. Tap a cook (YOU or a zombie), then this ${st.kind}.</div>`;
      const lamp = f.keepWarm
        ? `<div class="small">${icon('keep_warm', 'ico-s')} Heat lamp installed: food waits 50% longer before burning.</div>`
        : `<div class="actions"><button class="btn" data-a="lamp" ${s.level < 3 ? 'disabled' : ''}>Heat lamp · ${priceHtml({ cash: keepWarmCost() })}</button></div><div class="small">${s.level < 3 ? 'Unlocks at level 3. ' : ''}Finished food waits 50% longer before it burns.</div>`;
      const tier = f.tier ?? 0;
      const up = stoveTierCost(s, st.id);
      const upg = `<div class="actions"><button class="btn" data-a="upgrade" ${up === null ? 'disabled' : ''}>${up === null ? 'Fully upgraded' : `Upgrade ${tier + 1}/${STOVE_TIERS.length} · ${priceHtml({ cash: up })}`}</button></div><div class="small">Tier ${tier}: cooks ${tier * 10}% faster, food waits ${tier * 15}% longer before it burns.</div>`;
      html = `<h3>${esc(name)}</h3><div class="sub">Station</div>${body}${lamp}${upg}`;
    } else if (sel.kind === 'dishPicker') {
      const st = s.stoves.find((x) => x.id === sel.stoveId)!;
      const w = s.workers.find((x) => x.id === sel.workerId);
      const rows = withLearnedVariants(s)
        .filter((d) => stoveCooks(st, d.station) && (d.source === 'level' || dishAvailable(s, d.id)))
        .map((d) => dishRow(d.id, s, true))
        .join('');
      const raidLocked = DISHES.filter((d) => stoveCooks(st, d.station) && d.source === 'raid' && !dishAvailable(s, d.id)).length;
      html = `<h3>What should ${w?.kind === 'you' ? 'you' : esc(w?.name ?? 'they')} cook?</h3><div class="sub">${esc(ITEM_BY_ID[s.furniture.find((f) => f.id === st.furnitureId)!.item].name)}</div>${rows}${raidLocked ? `<div class="small">${raidLocked} more secret recipe${raidLocked > 1 ? 's' : ''} for this station can be stolen in raids.</div>` : ''}`;
    } else if (sel.kind === 'counter') {
      const slots = s.counter.filter((c) => c.dish && c.servings > 0);
      const rows = slots.length
        ? slots
            .map((c) => {
              const d = DISH_BY_ID[c.dish!];
              return `<div class="fridge-row"><img src="${artUrl(d.icon)}" alt=""/><b>${esc(d.name)}<br/><span class="sub" data-live="sv${c.id}">${c.servings} servings left</span></b><button class="btn red tiny" data-a="discard" data-id="${c.id}">Bin it</button></div>`;
            })
            .join('')
        : '<div class="state">Empty! Tap a cook, then a stove, to make food. Hungry customers walk out.</div>';
      html = `<h3>Serving Counter</h3><div class="sub">${s.counter.length} spots · ${s.counter.reduce((a, c) => a + (c.dish ? c.servings : 0), 0)} servings</div>${rows}`;
    } else if (sel.kind === 'furniture') {
      const f = s.furniture.find((x) => x.id === sel.id);
      if (!f) return this.ctl.select(null);
      const def = ITEM_BY_ID[f.item];
      let body = `<div class="small">${esc(def.blurb)}</div>`;
      if (def.payout) {
        const bank = Math.floor(f.bank ?? 0);
        const st = payoutState(s, f.id);
        body += `<div class="state" data-live="pay">${priceHtml({ cash: bank })} of ${priceHtml({ cash: def.payout.max })} · earns ${priceHtml({ cash: def.payout.perHour })}/hour${st === 'full' ? ' · FULL, empty it!' : s.closed ? ' · paused while closed' : ''}</div>`;
        if (st !== 'none') body += `<div class="actions"><button class="btn green" data-a="collect">Collect</button></div>`;
      }
      if (def.kind === 'tombstone') body += tombstoneCard(s, f);
      if (def.kind === 'table') body += `<div class="state">${f.dirty ? 'Dirty plate waiting to be cleared.' : chairTableCount(s, f.id) ? 'Ready for a customer.' : 'Needs a chair facing it to seat anyone.'}</div>`;
      html = `<div class="row"><img class="card-art" src="${artUrl(def.art)}" alt=""/><div class="grow"><h3>${esc(def.name)}</h3><div class="sub">${def.tab}</div></div></div>${body}`;
    }
    const full = `<button class="x" data-a="close" aria-label="Close">${icon('ui_cancel', 'x-ico')}</button>${html}`;
    // Only rebuild when the card's structure changes; otherwise patch the live bars/text in place,
    // so buttons are never swapped out from under a finger mid-tap.
    const tpl = document.createElement('template');
    tpl.innerHTML = full;
    const live = [...tpl.content.querySelectorAll<HTMLElement>('[data-live]')].map((n) => {
      const v = { k: n.dataset.live!, text: n.textContent ?? '', style: n.getAttribute('style') ?? '' };
      n.textContent = '';
      n.removeAttribute('style');
      return v;
    });
    const structure = `${sel.kind}:${tpl.innerHTML}`;
    this.root.classList.add('card-open');
    if (structure === this.lastStructure && !card.classList.contains('hidden')) {
      for (const v of live) {
        const n = card.querySelector<HTMLElement>(`[data-live="${v.k}"]`);
        if (!n) continue;
        if (n.textContent !== v.text) n.textContent = v.text;
        if ((n.getAttribute('style') ?? '') !== v.style) n.setAttribute('style', v.style);
      }
      return;
    }
    this.lastStructure = structure;
    card.innerHTML = full;
    card.classList.remove('hidden');
    bindActions(card, (a, el) => this.cardAction(a, el));
    card.querySelectorAll<HTMLElement>('[data-dish]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        this.ctl.chooseDish(b.dataset.dish!);
      };
    });
  }

  private cardAction(a: string, el?: HTMLElement) {
    const s = this.ctl.state;
    const sel = this.ctl.selection;
    if (a === 'close') {
      sfx('close');
      return this.ctl.select(null);
    }
    if (sel?.kind === 'worker') {
      if (a === 'rest') {
        const err = rest(s, sel.id);
        if (err) this.ctl.toast(err);
        else sfx('snore', { volume: 0.6 });
      }
      if (a === 'wake') wake(s, sel.id);
      if (a === 'refill') {
        const err = refill(s, sel.id);
        if (err) this.ctl.toast(err);
        else {
          sfx('heal');
          this.ctl.info('Glug glug… ENERGY!');
        }
      }
      if (a === 'fire') {
        if (this.fireArmed !== sel.id) {
          this.fireArmed = sel.id;
          setTimeout(() => (this.fireArmed = ''), 3000);
        } else {
          const name = s.workers.find((w) => w.id === sel.id)?.name;
          const err = fireZombie(s, sel.id);
          if (err) this.ctl.toast(err);
          else {
            this.ctl.info(`${name} lurches off into the sunset.`);
            sfx('groan', { pitch: 0.7 });
            this.ctl.select(null);
          }
          this.fireArmed = '';
        }
      }
      this.lastStructure = '';
      this.renderCard();
    }
    if (sel?.kind === 'customer' && a === 'infect') {
      const err = infect(s, sel.id);
      if (err) this.ctl.toast(err);
      else {
        this.ctl.info('CHOMP! The infection spreads…');
        sfx('chomp');
        this.ctl.select(null);
      }
    }
    if (sel?.kind === 'stove' && a === 'finish') {
      const err = finishNow(s, sel.id);
      if (err) this.ctl.toast(err);
      else sfx('ding');
    }
    if (sel?.kind === 'stove' && a === 'cancel') {
      if (this.cancelArmed !== sel.id) {
        this.cancelArmed = sel.id;
        setTimeout(() => (this.cancelArmed = ''), 3000);
      } else {
        const err = cancelCooking(s, sel.id);
        if (err) this.ctl.toast(err);
        else sfx('sell');
        this.cancelArmed = '';
      }
      this.lastStructure = '';
      this.renderCard();
    }
    if (sel?.kind === 'counter' && a === 'discard' && el?.dataset.id) {
      const err = discardCounter(s, el.dataset.id);
      if (err) this.ctl.toast(err);
      else sfx('burn', { volume: 0.5 });
      this.lastStructure = '';
      this.renderCard();
    }
    if (sel?.kind === 'stove' && a === 'upgrade') {
      const err = upgradeStove(s, sel.id);
      if (err) this.ctl.toast(err);
      else sfx('purchase');
      this.lastStructure = '';
      this.renderCard();
    }
    if (sel?.kind === 'stove' && a === 'lamp') {
      const err = buyKeepWarm(s, sel.id);
      if (err) this.ctl.toast(err);
      else sfx('purchase');
      this.lastStructure = '';
      this.renderCard();
    }
    if (sel?.kind === 'furniture' && a === 'collect') {
      collectPayout(s, sel.id);
      this.lastStructure = '';
      this.renderCard();
    }
    if (sel?.kind === 'furniture' && tombstoneAction(this.ctl, a, sel.id)) {
      this.lastStructure = '';
      this.renderCard();
    }
  }
}

function chairTableCount(s: Controller['state'], tableId: string): number {
  return s.furniture.filter((c) => chairTable(s, c)?.id === tableId).length;
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
