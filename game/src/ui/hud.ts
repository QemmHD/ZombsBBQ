import { buildChar, buildProps, type CharArt } from '../art';
import {
  CUSTOMER_BY_ID,
  DISHES,
  DISH_BY_ID,
  TUTORIAL,
  attackThreshold,
  infect,
  infectCost,
  refill,
  rest,
  stars,
  wake,
  xpToNext,
  zombies,
  type Worker,
} from '../sim';
import type { Controller } from '../game/controller';

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const headCache = new Map<string, string>();
/** Portrait = the character's head part, cropped. */
export function headUrl(charId: string): string {
  let u = headCache.get(charId);
  if (!u) {
    let art: CharArt | null = null;
    try {
      art = buildChar(charId as never);
    } catch {
      art = null;
    }
    const head = art?.parts.find((p) => p.key.endsWith('head'));
    u = head ? svgUrl(head.svg) : '';
    headCache.set(charId, u);
  }
  return u;
}

let propUrls: Map<string, string> | null = null;
export function propUrl(key: string): string {
  if (!propUrls) propUrls = new Map(buildProps().map((a) => [a.key, svgUrl(a.svg)]));
  return propUrls.get(key) ?? '';
}

export const charIdFor = (w: { kind: string; type: string }) => (w.kind === 'you' ? 'you' : `${w.type}_z`);

const fmt = (n: number) => n.toLocaleString('en-US');
const fmtTime = (sec: number) => {
  sec = Math.max(0, Math.ceil(sec));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, '0')}s`;
  return `${Math.floor(sec / 3600)}h ${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`;
};
const energyColor = (f: number) => (f > 0.5 ? '#6fcf3a' : f > 0.25 ? '#ffc83d' : '#e2403a');

const WORKER_STATE: Record<Worker['state'], string> = {
  idle: 'Ready to serve',
  toStove: 'Heading to the stove',
  cooking: 'Cooking',
  toCounter: 'Grabbing food',
  carrying: 'Serving a customer',
  hunting: 'HANGRY! Going for a customer!',
  toRest: 'Off for a nap',
  resting: 'Napping on the lawn… Zzz',
  daydream: 'Daydreaming about brains… (tap to snap out of it)',
};

export class Hud {
  private root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private lastCash = -1;
  private lastSauce = -1;
  private lastTut = -1;
  private lastStructure = '';

  constructor(private ctl: Controller) {
    this.root = document.getElementById('hud')!;
    this.root.innerHTML = `
      <div class="awning">
        <div class="lvl" data-k="lvl">1</div>
        <div class="joint-name"><b>YOUR JOINT</b><span class="stars" data-k="stars"></span></div>
        <div class="xpbar"><i data-k="xpfill"></i><span data-k="xptext"></span></div>
        <div class="cur cash" data-k="cash"><span class="ico">$</span><span data-k="cashv"></span></div>
        <div class="cur sauce" data-k="sauce"><span class="ico">🧪</span><span data-k="saucev"></span></div>
        <button class="gear" data-k="gear" aria-label="Settings">⚙</button>
      </div>
      <div class="side left">
        <button class="btn-sq" data-k="crew" aria-label="Crew"><span class="em">🧟</span><label>CREW</label><span class="badge" data-k="crewc"></span></button>
        <button class="btn-sq" data-k="book" aria-label="Cookbook"><span class="em">📖</span><label>MENU</label></button>
        <button class="btn-sq soon" data-k="shop" aria-label="Shop"><span class="em">🛍️</span><label>SHOP</label></button>
        <button class="btn-sq soon" data-k="map" aria-label="Raid map"><span class="em">🗺️</span><label>RAID</label></button>
      </div>
      <div class="hint hidden" data-k="hint"><img alt="" data-k="gusimg"/><div class="bubble"><b>GUS, ZOMBIE UNION REP</b><span data-k="hinttext"></span></div></div>
      <div class="card hidden" data-k="card"></div>
      <div class="toasts" data-k="toasts"></div>
      <div data-k="modal"></div>
    `;
    this.root.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => (this.el[n.dataset.k!] = n));
    (this.el.gusimg as HTMLImageElement).src = headUrl('gus');
    this.el.gear.onclick = () => this.showSettings();
    this.el.crew.onclick = () => this.showCrew();
    this.el.book.onclick = () => this.showCookbook();
    this.el.shop.onclick = () => ctl.toast('The shop opens in the next build. Gus is still haggling with suppliers.');
    this.el.map.onclick = () => ctl.toast('Raids are coming! Chuck Wagon’s Chow Hall had better lock its doors.');
    this.el.card.addEventListener('pointerdown', (e) => e.stopPropagation());
    ctl.onSelection(() => this.renderCard());
    ctl.onToast((t) => this.showToast(t));
    ctl.onEvent((e) => {
      if (e.t === 'levelup') this.showModal(`<h2>LEVEL ${e.level}!</h2><p>${levelUpText(e.level)}</p>`);
      if (e.t === 'infected') {
        const w = ctl.state.workers.find((x) => x.id === e.workerId);
        if (w) ctl.toast(`${w.name} joined the crew! 🧟`);
      }
      if (e.t === 'burnt') ctl.toast('Something’s BURNING! 🔥');
    });
    setInterval(() => this.refresh(), 200);
    this.refresh();
    if (ctl.offlineReport) this.showOffline();
  }

  private refresh() {
    const s = this.ctl.state;
    this.el.lvl.textContent = String(s.level);
    const st = stars(s);
    let h = '';
    for (let i = 1; i <= 5; i++) h += st >= i ? '★' : st >= i - 0.5 ? '⯪' : '<span class="off">★</span>';
    this.el.stars.innerHTML = h;
    const need = xpToNext(s.level);
    this.el.xpfill.style.width = `${Math.min(100, (s.xp / need) * 100)}%`;
    this.el.xptext.textContent = `${Math.floor(s.xp)}/${need} XP`;
    if (s.cash !== this.lastCash) {
      this.el.cashv.textContent = fmt(s.cash);
      if (this.lastCash >= 0 && s.cash > this.lastCash) this.bump(this.el.cash);
      this.lastCash = s.cash;
    }
    if (s.sauce !== this.lastSauce) {
      this.el.saucev.textContent = fmt(s.sauce);
      this.lastSauce = s.sauce;
    }
    this.el.crewc.textContent = `${zombies(s).length}/${s.crewCap}`;
    if (s.tut !== this.lastTut) {
      this.lastTut = s.tut;
      const text = TUTORIAL[s.tut];
      this.el.hint.classList.toggle('hidden', !text);
      if (text) this.el.hinttext.textContent = text;
    }
    if (this.ctl.selection && this.ctl.selection.kind !== 'dishPicker') this.renderCard();
    if (this.ctl.offlineReport && !this.el.modal.innerHTML) this.showOffline();
  }

  private bump(n: HTMLElement) {
    n.classList.remove('bump');
    void n.offsetWidth;
    n.classList.add('bump');
  }

  showToast(t: string) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = t;
    this.el.toasts.appendChild(d);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild!.remove();
    setTimeout(() => d.remove(), 2700);
  }

  private showModal(html: string, onClose?: () => void) {
    this.el.modal.innerHTML = `<div class="modal-bg"><div class="modal">${html}<div class="actions"><button class="btn" data-close>OK!</button></div></div></div>`;
    const close = () => {
      this.el.modal.innerHTML = '';
      onClose?.();
    };
    this.el.modal.querySelector<HTMLElement>('[data-close]')!.onclick = close;
    this.el.modal.querySelector<HTMLElement>('.modal-bg')!.onclick = (e) => {
      if (e.target === e.currentTarget) close();
    };
    this.el.modal.querySelector<HTMLElement>('.modal-bg')!.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  private showOffline() {
    const r = this.ctl.offlineReport!;
    this.showModal(
      `<h2>Welcome back, Boss!</h2><p>The crew kept the joint running for ${fmtTime(r.sec)}${r.sec >= 8 * 3600 ? ' (8h max)' : ''}.</p><p style="font-size:22px">+ $${fmt(Math.max(0, r.cash))}</p>`,
      () => (this.ctl.offlineReport = null),
    );
    this.ctl.offlineReport = null;
  }

  private showSettings() {
    this.showModal(
      `<h2>Settings</h2><p>Zombs BBQ prototype · build ${__BUILD__}</p><div class="actions"><button class="btn blue" data-reset>Start a new joint</button></div><p class="small">Your progress saves on this device automatically.</p>`,
    );
    this.el.modal.querySelector<HTMLElement>('[data-reset]')!.onclick = () => {
      if (confirm('Wipe this joint and start over?')) {
        this.ctl.reset();
        this.el.modal.innerHTML = '';
      }
    };
  }

  private showCrew() {
    const s = this.ctl.state;
    const rows = s.workers
      .map((w) => {
        const f = w.energy / w.stats.energy;
        return `<div class="crew-row" data-id="${w.id}"><img src="${headUrl(charIdFor(w))}" alt=""/><b>${w.name}<br/><span class="sub">${WORKER_STATE[w.state]}</span></b><div class="bar"><i style="width:${f * 100}%;background:${energyColor(f)}"></i></div></div>`;
      })
      .join('');
    this.showModal(`<h2>Crew ${zombies(s).length}/${s.crewCap}</h2><div class="list">${rows}</div><p class="small">Infect customers to grow your crew. Level up for more slots.</p>`);
    this.el.modal.querySelectorAll<HTMLElement>('.crew-row').forEach((r) => {
      r.onclick = () => {
        this.el.modal.innerHTML = '';
        this.ctl.tapWorker(r.dataset.id!);
      };
    });
  }

  private showCookbook() {
    const s = this.ctl.state;
    const rows = DISHES.map((d) => dishRow(d.id, s.level)).join('');
    this.showModal(`<h2>Cookbook</h2><div class="list">${rows}</div><p class="small">Tap a cook, then a stove, to cook.</p>`);
  }

  renderCard() {
    const s = this.ctl.state;
    const sel = this.ctl.selection;
    const card = this.el.card;
    if (!sel) {
      card.classList.add('hidden');
      this.root.classList.remove('card-open');
      this.lastStructure = '';
      return;
    }
    let html = '';
    if (sel.kind === 'worker') {
      const w = s.workers.find((x) => x.id === sel.id);
      if (!w) return this.ctl.select(null);
      const f = w.energy / w.stats.energy;
      const resting = w.state === 'resting' || w.state === 'toRest';
      let state = WORKER_STATE[w.state];
      if (w.state === 'cooking') {
        const st = s.stoves.find((x) => x.id === w.stoveId);
        if (st?.dish) state = `Cooking ${DISH_BY_ID[st.dish].name} · ${fmtTime((st.doneAt ?? 0) - s.now)}`;
      }
      const warn = w.kind === 'zombie' && !resting && f <= attackThreshold(w.stats.patience) + 0.1 ? ' ⚠️ about to bite!' : '';
      html = `
        <div class="row"><div class="portrait"><img src="${headUrl(charIdFor(w))}" alt=""/></div>
        <div style="flex:1"><h3>${w.name}</h3><div class="sub">${w.kind === 'you' ? 'Patient Zero · the Boss' : `${CUSTOMER_BY_ID[w.type].name}, ex-customer`}</div>
        <div class="bar"><i data-live="ebar" style="width:${f * 100}%;background:${energyColor(f)}"></i></div>
        <div class="state" data-live="etext">Energy ${Math.floor(w.energy)}/${w.stats.energy}${warn}</div></div></div>
        <div class="state" data-live="state">${state}</div>
        <div class="chips"><span class="chip">SPD ${w.stats.speed}</span><span class="chip">PWR ${w.stats.power}</span><span class="chip">TIPS ${w.stats.tips}</span><span class="chip">FOCUS ${w.stats.focus}</span><span class="chip">PATIENCE ${w.stats.patience}</span></div>
        <div class="actions">
          ${resting ? `<button class="btn blue" data-a="wake">Back to work</button>` : `<button class="btn blue" data-a="rest" ${w.state === 'cooking' ? 'disabled' : ''}>Rest 💤</button>`}
          <button class="btn sauce" data-a="refill" ${f >= 1 ? 'disabled' : ''}>Refill 🧪1</button>
        </div>
        <div class="small">👉 To cook: now tap the Grill${s.level >= 4 ? ' or Smoker' : ''}.</div>`;
    } else if (sel.kind === 'customer') {
      const c = s.customers.find((x) => x.id === sel.id);
      if (!c || !['entering', 'waiting', 'eating'].includes(c.state)) {
        if (c?.state !== 'infecting') this.ctl.select(null);
        return;
      }
      const def = CUSTOMER_BY_ID[c.type];
      const cost = infectCost(s, c);
      const costTxt = cost.cash === 0 && cost.sauce === 0 ? 'FREE' : cost.sauce ? `🧪${cost.sauce}` : `$${fmt(cost.cash)}`;
      const full = zombies(s).length >= s.crewCap;
      html = `
        <div class="row"><div class="portrait"><img src="${headUrl(c.type)}" alt=""/></div>
        <div style="flex:1"><h3>${def.name}</h3><div class="sub">${c.state === 'eating' ? 'Chowing down' : c.state === 'waiting' ? 'Waiting for food' : 'Walking in'}</div>
        ${c.state === 'waiting' ? `<div class="bar"><i data-live="wait" style="width:${(c.waitLeft / 50) * 100}%;background:${energyColor(c.waitLeft / 50)}"></i></div>` : ''}</div>
        <div class="portrait" title="Zombie form"><img src="${headUrl(`${c.type}_z`)}" alt=""/></div></div>
        <div class="chips"><span class="chip">SPD ${def.stats.speed}</span><span class="chip">PWR ${def.stats.power}</span><span class="chip">TIPS ${def.stats.tips}</span><span class="chip">FOCUS ${def.stats.focus}</span><span class="chip">PATIENCE ${def.stats.patience}</span></div>
        <div class="actions"><button class="btn infect" data-a="infect" ${full ? 'disabled' : ''}>INFECT · ${costTxt}</button></div>
        <div class="small">${full ? `Crew full (${s.crewCap}/${s.crewCap}). Level up for more slots.` : `Becomes: ${def.zombieName}`}</div>`;
    } else if (sel.kind === 'stove') {
      const st = s.stoves.find((x) => x.id === sel.id)!;
      const f = s.furniture.find((x) => x.id === st.furnitureId)!;
      const name = st.kind === 'grill' ? 'Rusty Grill' : 'Barrel Smoker';
      let body = '';
      if (f.locked) body = `<div class="state">Unlocks at level 4. Smoked meats = big money.</div>`;
      else if (st.status === 'cooking' && st.dish) {
        const d = DISH_BY_ID[st.dish];
        const p = 1 - ((st.doneAt ?? 0) - s.now) / d.cookSec;
        body = `<div class="state" data-live="cook">Cooking ${d.name} · ${fmtTime((st.doneAt ?? 0) - s.now)} left</div><div class="bar"><i data-live="cbar" style="width:${p * 100}%;background:#ff8a1f"></i></div>`;
      } else if (st.status === 'reserved') body = `<div class="state">The cook is on the way…</div>`;
      else body = `<div class="state">Empty. Tap a cook (YOU or a zombie), then this ${st.kind}.</div>`;
      html = `<h3>${name}</h3><div class="sub">Station</div>${body}`;
    } else if (sel.kind === 'dishPicker') {
      const st = s.stoves.find((x) => x.id === sel.stoveId)!;
      const w = s.workers.find((x) => x.id === sel.workerId);
      const rows = DISHES.filter((d) => d.station === st.kind)
        .map((d) => dishRow(d.id, s.level, s.cash))
        .join('');
      html = `<h3>What should ${w?.kind === 'you' ? 'you' : w?.name ?? 'they'} cook?</h3><div class="sub">${st.kind === 'grill' ? 'Rusty Grill' : 'Barrel Smoker'}</div>${rows}`;
    }
    const full = `<button class="x" data-a="close" aria-label="Close">✕</button>${html}`;
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
    card.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => {
      b.onclick = () => this.action(b.dataset.a!);
    });
    card.querySelectorAll<HTMLElement>('[data-dish]').forEach((b) => {
      b.onclick = () => this.ctl.chooseDish(b.dataset.dish!);
    });
  }

  private action(a: string) {
    const s = this.ctl.state;
    const sel = this.ctl.selection;
    if (a === 'close') return this.ctl.select(null);
    if (sel?.kind === 'worker') {
      if (a === 'rest') this.ctl.toast(rest(s, sel.id));
      if (a === 'wake') wake(s, sel.id);
      if (a === 'refill') {
        const err = refill(s, sel.id);
        this.ctl.toast(err ?? 'Glug glug… ENERGY! 🧪');
      }
      this.renderCard();
    }
    if (sel?.kind === 'customer' && a === 'infect') {
      const err = infect(s, sel.id);
      if (err) this.ctl.toast(err);
      else {
        this.ctl.toast('CHOMP! The infection spreads…');
        this.ctl.select(null);
      }
    }
  }
}

function dishRow(id: string, level: number, cash?: number): string {
  const d = DISH_BY_ID[id];
  const locked = d.level > level;
  const cant = cash !== undefined && cash < d.cost;
  return `<button class="dish ${locked || cant ? 'locked' : ''}" ${cash !== undefined && !locked ? `data-dish="${d.id}"` : ''}>
    <img src="${propUrl(d.icon)}" alt=""/>
    <span><b>${d.name}</b><small>${locked ? `🔒 Level ${d.level}` : `⏱ ${fmtTime(d.cookSec)} · ${d.servings} servings · $${d.price}/serving · +${d.xp} XP`}</small></span>
    <span class="price">$${fmt(d.cost)}</span></button>`;
}

function levelUpText(level: number): string {
  const unlocked = DISHES.filter((d) => d.level === level).map((d) => d.name);
  const parts = [];
  if (unlocked.length) parts.push(`New recipe: ${unlocked.join(', ')}`);
  if (level === 4) parts.push('The Barrel Smoker is unlocked!');
  if ((level - 1) % 3 === 0) parts.push('+1 crew slot');
  return parts.length ? parts.join(' · ') : 'The joint grows more infamous…';
}

declare const __BUILD__: string;
