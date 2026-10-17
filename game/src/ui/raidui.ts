import { MAP3_LAYOUT } from '../art3/raidmap3';
import {
  DISH_BY_ID,
  HEADSTONE_SAUCE,
  ITEM_BY_ID,
  RAID_TIME,
  REOPEN_SAUCE,
  RIVAL_BY_ID,
  ROAD,
  SUMMON_COST,
  TOMBSTONE_RECHARGE_SAUCE,
  TOMBSTONE_UPGRADE_SAUCE,
  bossHere,
  buyHeadstone,
  buySummon,
  markWarned,
  maxEnergy,
  order,
  raidCandidates,
  rechargeTombstone,
  reopenRival,
  retreat,
  rivalClosed,
  rivalLevel,
  rivalName,
  rivalReady,
  rivalStats,
  rivalUnlocked,
  sendAll,
  stealingRivals,
  tombstoneMax,
  tombstoneUses,
  unwarnedThieves,
  upgradeTombstone,
  useHeadstone,
  useSummon,
  useTombstone,
  ABILITIES,
  raidThreat,
  raidReward,
  type Threat,
  type Furniture,
  type GameState,
  type RivalId,
} from '../sim';
import { music, sfx } from '../game/sfx';
import type { Controller } from '../game/controller';
import { artUrl, headUrl, rasterOrSvg } from '../scenes/assets';
import { charIdFor } from '../scenes/JointScene';
import type { Hud } from './hud';
import { bindActions, energyColor, esc, icon, priceHtml } from './dom';

/** The results card can't be waved away until this long after the fight ends (original REWARD_DELAY_DURATION). */
export const REWARD_DELAY_MS = 5000;
/** The card itself comes up a beat after the last blow, so the final KO plays out. */
const RESULT_SHOW_MS = 1400;

// ---------- the road-trip map ----------

/** Where each pin stands on the map (1600×900). */
const PIN: Record<string, { x: number; y: number }> = MAP3_LAYOUT;

export function openMap(hud: Hud) {
  const s = hud.ctl.state;
  music('map');
  const thieves = new Set(stealingRivals(s));
  for (const id of thieves) markWarned(s, id); // seen on the map counts as warned
  const list = [...ROAD, ...(bossHere(s) ? [RIVAL_BY_ID.boss] : [])];
  const pins = list
    .map((r) => {
      const pos = PIN[r.id];
      const unlocked = rivalUnlocked(s, r.id);
      const closed = rivalClosed(s, r.id);
      const prog = s.rivals[r.id];
      return `<button class="map-pin ${unlocked ? '' : 'locked'} ${r.id === 'boss' ? 'boss' : ''}" style="left:${(pos.x / 1600) * 100}%;top:${(pos.y / 900) * 100}%" data-a="rival" data-id="${r.id}">
      <img src="${artUrl(`map_joint_${r.id}`) || artUrl('map_joint_chuck')}" alt=""/>${closed ? `<img class="pin-over" src="${artUrl('map_closed')}" alt=""/>` : ''}${thieves.has(r.id) ? `<img class="pin-steal" src="${artUrl('map_steal')}" alt=""/>` : ''}
      <span class="pin-label">${unlocked ? '' : icon('fx_lock', 'ico-s')}${r.id === 'boss' ? 'BOSS ' : ''}LV ${rivalLevel(s, r.id)}${prog?.wins ? ` ${stars3(prog.stars)}` : ''}</span></button>`;
    })
    .join('');
  const home = PIN.home;
  const m = hud.openModal(
    `<div class="map-wrap"><img class="map-bg" src="${rasterOrSvg('map_bg')}" alt="Road trip map"/>
      <div class="map-pin home" style="left:${(home.x / 1600) * 100}%;top:${(home.y / 900) * 100}%"><img src="${artUrl('map_home')}" alt=""/><span class="pin-label">YOUR JOINT</span></div>
      ${pins}</div>
      ${thieves.size ? `<p class="small warn">${[...thieves].map((id) => esc(rivalName(s, id))).join(', ')} ${thieves.size > 1 ? 'are' : 'is'} stealing your customers (and costing you half a star)! Raid them to put a stop to it.</p>` : ''}`,
    { cls: 'map', onClose: () => hud.ctl.mode === 'play' && music('joint') },
  );
  bindActions(m, (a, el) => {
    if (a === 'rival') {
      sfx('tap');
      openRivalCard(hud, el.dataset.id as RivalId);
    }
  });
}

function openRivalCard(hud: Hud, id: RivalId) {
  const s = hud.ctl.state;
  const r = RIVAL_BY_ID[id];
  const prog = s.rivals[id];
  const err = rivalReady(s, id);
  const gen = prog?.gen ?? 0;
  const lvl = rivalLevel(s, id);
  const st = rivalStats(id, lvl, gen);
  const sig = r.signature ? DISH_BY_ID[r.signature] : undefined;
  const recipe = sig ? `<img class="ico" src="${artUrl(sig.icon)}" alt=""/> <span>${esc(sig.name)} recipe${s.recipes.includes(sig.id) ? ' (known)' : ''}</span>` : '<span>+ a secret recipe</span>';
  const loot =
    id === 'boss'
      ? `${priceHtml({ cash: raidReward(s, st, id).cash })} <span>+${st.reward.xp} XP</span> ${icon('ui_sauce', 'ico-s')}<span>3–5 sauce</span> <span>+ a secret recipe</span>`
      : `${priceHtml({ cash: raidReward(s, st, id).cash })} <span>+${st.reward.xp} XP</span> ${recipe} <span>${icon('ui_sauce', 'ico-s')} maybe</span>`;
  const closed = id !== 'boss' && rivalClosed(s, id);
  // once you've won here and know the recipe, a rerun only pays cash and XP (plus whatever's on the counter)
  const replay = !!prog?.wins && id !== 'boss' && (!sig || s.recipes.includes(sig.id));
  const threat = raidThreat(s, id, defaultSquad(s).map((w) => w.id));
  const m = hud.openModal(
    `<div class="rival-head"><img src="${headUrl(`boss_${id}`)}" alt=""/><div><h2>${esc(rivalName(s, id))}</h2><div class="sub">Head Chef: ${esc(r.chef)} · Level ${lvl}${gen ? ' · new management' : ''}</div>${prog?.wins ? `<div class="stars">${stars3(prog.stars)}</div>` : ''}</div></div>
    <p class="quote">“${esc(r.taunt)}”</p>
    <div class="chips"><span class="chip">${st.diners} diners</span><span class="chip">${st.staff.count} ${id === 'boss' ? 'minions' : 'waiters'}</span><span class="chip">Chef ${st.chef.hp} HP</span></div>
    <div class="loot-row"><span>Win:</span> ${loot}</div>
    ${replay ? '<div class="loot-row"><span>Replay: cash + XP only</span></div>' : ''}
    <div class="loot-row"><span>Plus:</span> <span>their counter food · $${st.dinerCash} a diner · +2 XP a bite</span></div>
    ${threatHtml(threat.label, 'your rested crew')}
    ${gusTip()}
    <div class="actions"><button class="btn" data-a="back">${icon('ui_raid', 'ico-s')} Map</button>${
      closed ? `<button class="btn green" data-a="reopen" ${s.sauce < REOPEN_SAUCE ? 'disabled' : ''}>Reopen now · ${priceHtml({ sauce: REOPEN_SAUCE })}</button>` : ''
    }<button class="btn red big-btn" data-a="go" ${err ? 'disabled' : ''}>RAID!</button></div>
    ${err ? `<p class="small warn">${esc(err)}</p>` : '<p class="small">Pick your squad next (zombies only: you mind the joint). Energy is health in a fight! Diners you catch pay out even if you lose.</p>'}`,
    { cls: 'narrow', onClose: () => hud.ctl.mode === 'play' && music('joint') },
  );
  bindActions(m, (a) => {
    if (a === 'back') openMap(hud);
    if (a === 'go') openSquad(hud, id);
    if (a === 'reopen') {
      const e = reopenRival(s, id);
      if (e) return hud.ctl.toast(e);
      sfx('purchase');
      openRivalCard(hud, id);
    }
  });
}

/** Gus's standing raid advice (focusing the waiters turns many coin-toss fights into wins). */
const gusTip = () => `<div class="loot-row gus-tip"><img class="ico" src="${headUrl('gus')}" alt=""/><span><b>Gus:</b> “Clear the waiters first; stay out of the kitchen.”</span></div>`;

const THREAT_COL: Record<Threat, string> = { Easy: '#7a9a32', Even: '#c9a63a', Deadly: '#a3342a' };
function threatHtml(label: Threat, who: string): string {
  return `<div class="loot-row"><span>Threat vs ${esc(who)}:</span> <b style="background:${THREAT_COL[label]};color:#fff;border-radius:6px;padding:1px 8px">${label.toUpperCase()}</b></div>`;
}

/** Who goes by default: every free zombie with more than half its energy. */
function defaultSquad(s: GameState) {
  return raidCandidates(s).filter((w) => w.energy > maxEnergy(w) * 0.5);
}

/** Results stars: the raid scores 1–3, so three slots (not the rating's five). */
function stars3(n: number): string {
  let h = '';
  for (let i = 1; i <= 3; i++) h += `<b class="st ${n >= i ? 'on' : ''}">★</b>`;
  return h;
}

function openSquad(hud: Hud, id: RivalId, picked?: Set<string>, pets?: Set<string>) {
  const s = hud.ctl.state;
  const cands = raidCandidates(s);
  picked ??= new Set(defaultSquad(s).map((w) => w.id));
  pets ??= new Set(s.pets.map((p) => p.id));
  const tiles = cands
    .map((w) => {
      const f = w.energy / maxEnergy(w);
      return `<button class="squad-tile ${picked!.has(w.id) ? 'on' : ''}" data-a="toggle" data-id="${w.id}"><img src="${headUrl(charIdFor(w))}" alt=""/><b>${esc(w.name)}</b><span class="bar"><i style="width:${f * 100}%;background:${energyColor(f)}"></i></span><span class="sub">PWR ${w.stats.power} · ${Math.floor(w.energy)} HP</span>${ABILITIES[w.type] ? `<span class="sub" title="${esc(ABILITIES[w.type])}">★ ${esc(ABILITIES[w.type].split(":")[0])}</span>` : ""}</button>`;
    })
    .join('');
  const petTiles = s.pets
    .map(
      (p) =>
        `<button class="squad-tile ${pets!.has(p.id) ? 'on' : ''}" data-a="pet" data-id="${p.id}"><img src="${headUrl(p.type === 'pug' ? 'pet_pug' : 'pet_rotweiler')}" alt=""/><b>${p.type === 'pug' ? 'Zombie Pug' : 'Rot-weiler'}</b><span class="sub">Pet</span></button>`,
    )
    .join('');
  const stones = tombstones(s);
  const m = hud.openModal(
    `<h2>Pick your squad · ${esc(rivalName(s, id))}</h2>
    <div class="squad">${tiles || '<p>No zombie’s free! Knocked-out zombies can’t come (cooks can: their dish waits), and the chef (you) minds the joint.</p>'}${petTiles}</div>
    ${picked.size ? threatHtml(raidThreat(s, id, [...picked]).label, 'this squad') : ''}${gusTip()}
    <div class="kit"><span>${
      stones.length ? `Tombstones: ${stones.map((f) => `${icon(ITEM_BY_ID[f.item].art, 'ico')}×${tombstoneUses(s, f)}`).join(' ')}` : 'No tombstones yet: buy them in the Shop (Special) and set them on your lawn.'
    }</span>
      <button class="btn tiny" data-a="buyhs">${icon('fx_headstone', 'ico-s')} Health Stone ×${s.inventory.headstone} · +1 ${priceHtml({ sauce: HEADSTONE_SAUCE })}</button>
      <button class="btn tiny" data-a="buysm" ${s.level < 5 ? 'disabled' : ''}>${icon('fx_summon', 'ico-s')} Summon ×${s.inventory.summon} · +1 ${priceHtml({ sauce: SUMMON_COST })}</button></div>
    <div class="actions"><button class="btn" data-a="back">Back</button><button class="btn red big-btn" data-a="start" ${picked.size ? '' : 'disabled'}>SEND ${picked.size} TO THE FIGHT</button></div>`,
    { cls: 'wide', onClose: () => hud.ctl.mode === 'play' && music('joint') },
  );
  bindActions(m, (a, el) => {
    const wid = el.dataset.id!;
    if (a === 'toggle') {
      if (picked!.has(wid)) picked!.delete(wid);
      else picked!.add(wid);
      sfx('tap');
      return openSquad(hud, id, picked, pets);
    }
    if (a === 'pet') {
      if (pets!.has(wid)) pets!.delete(wid);
      else pets!.add(wid);
      return openSquad(hud, id, picked, pets);
    }
    if (a === 'buysm' || a === 'buyhs') {
      const err = a === 'buysm' ? buySummon(s) : buyHeadstone(s);
      if (err) hud.ctl.toast(err);
      else sfx('purchase');
      return openSquad(hud, id, picked, pets);
    }
    if (a === 'back') return openRivalCard(hud, id);
    if (a === 'start') {
      const err = hud.ctl.beginRaid(id, [...picked!], [...pets!]);
      if (err) return hud.ctl.toast(err);
      sfx('flag');
      music('raid');
    }
  });
}

/** Your placed raid tombstones (the lawn ones). */
function tombstones(s: GameState) {
  return s.furniture.filter((f) => ITEM_BY_ID[f.item]?.kind === 'tombstone');
}

// ---------- rivals stealing your customers ----------

/**
 * Called by the HUD a few times a second: badge the RAID button while a rival is poaching your
 * customers, and the first time one starts, say so once with a Raid Now button.
 */
export function watchRoad(hud: Hud, mapBtn: HTMLElement) {
  const ctl = hud.ctl;
  const s = ctl.state;
  const thieves = stealingRivals(s);
  let badge = mapBtn.querySelector<HTMLElement>('.badge.steal');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'badge ready steal';
    badge.textContent = '!';
    badge.style.left = '-8px';
    badge.style.right = 'auto';
    mapBtn.appendChild(badge);
  }
  badge.style.display = thieves.length ? '' : 'none';
  if (ctl.mode !== 'play' || hud.modalOpen) return;
  const fresh = unwarnedThieves(s);
  if (!fresh.length) return;
  for (const id of fresh) markWarned(s, id);
  const id = fresh[0];
  const m = hud.openModal(
    `<div class="rival-head"><img src="${headUrl(`boss_${id}`)}" alt=""/><div><h2>A competitor is stealing your customers!</h2><div class="sub">${esc(rivalName(s, id))}</div></div></div>
    <p>You haven’t paid them a visit in a while, so they’re luring your diners away. Fewer customers, and your rating drops half a star until you raid them.</p>
    <div class="actions"><button class="btn" data-a="later">Later</button><button class="btn red big-btn" data-a="raid">Raid now!</button></div>`,
    { cls: 'narrow' },
  );
  sfx('open');
  bindActions(m, (a) => {
    if (a === 'later') return hud.closeModal();
    sfx('tap');
    if (rivalReady(s, id)) openMap(hud);
    else openRivalCard(hud, id);
  });
}

// ---------- the tombstone card (tap a tombstone on the lawn) ----------

/** Extra lines for a tombstone's furniture card: uses left, Recharge · 2 sauce, the level-2 upgrade. */
export function tombstoneCard(s: GameState, f: Furniture): string {
  const left = tombstoneUses(s, f);
  const max = tombstoneMax(f);
  const lvl = f.lvl ?? 1;
  const wait = left <= 0 && f.usesResetAt ? ` · refills in ${Math.ceil((f.usesResetAt - s.now) / 3600)} h` : '';
  return `<div class="state">Level ${lvl} · ${left}/${max} uses left today${wait}</div>
    <div class="actions">${left < max ? `<button class="btn green" data-a="recharge" ${s.sauce < TOMBSTONE_RECHARGE_SAUCE ? 'disabled' : ''}>Recharge · ${priceHtml({ sauce: TOMBSTONE_RECHARGE_SAUCE })}</button>` : ''}${
      lvl < 2 ? `<button class="btn" data-a="upgrade" ${s.sauce < TOMBSTONE_UPGRADE_SAUCE ? 'disabled' : ''}>Level 2 (7 uses) · ${priceHtml({ sauce: TOMBSTONE_UPGRADE_SAUCE })}</button>` : ''
    }</div>`;
}

/** Handle a tombstone card button. Returns true if the action was one of ours. */
export function tombstoneAction(ctl: Controller, a: string, furnitureId: string): boolean {
  if (a !== 'recharge' && a !== 'upgrade') return false;
  const err = a === 'recharge' ? rechargeTombstone(ctl.state, furnitureId) : upgradeTombstone(ctl.state, furnitureId);
  if (err) ctl.toast(err);
  else sfx('purchase');
  return true;
}

// ---------- in-raid HUD ----------

export class RaidUi {
  private built = '';
  private endAt = 0;
  constructor(
    private hud: Hud,
    private el: HTMLElement,
  ) {
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  refresh() {
    const ctl = this.hud.ctl;
    const r = ctl.raid;
    if (!r) {
      this.el.innerHTML = '';
      this.built = '';
      return;
    }
    const s = ctl.state;
    const def = RIVAL_BY_ID[r.rival];
    const stones = tombstones(s);
    const sig = `${r.rival}${r.units.length}${stones.map((f) => f.id).join()}`;
    if (this.built !== sig) {
      this.built = sig;
      this.el.innerHTML = `
        <div class="rh-top"><button class="flag-btn" data-a="flag" aria-label="Retreat">${icon('fx_flag', 'rh-ico')}</button>
          <div class="rh-name"><b>${esc(r.name)}</b><span class="sub">Level ${r.level} · Beat ${esc(def.chef)}!</span></div>
          <div class="rh-timer" data-k="timer"></div></div>
        <div class="rh-tray" data-k="tray"></div>
        <div class="rh-orders"><span class="rh-hint" data-k="hint"></span><button class="btn red" data-a="attack" data-k="attack">ATTACK</button><button class="btn red" data-a="sendall" data-k="sendall">ATTACK ALL</button></div>
        <div class="rh-loot" data-k="loot"></div>
        <div class="rh-items">
          ${stones.map((f) => `<button class="item-btn stone" data-a="stone" data-id="${f.id}">${icon(ITEM_BY_ID[f.item].art, 'rh-ico')}<span data-k="st${f.id}"></span></button>`).join('')}
          <button class="item-btn stone" data-a="hs" aria-label="Health Stone">${icon('fx_headstone', 'rh-ico')}<span data-k="hc"></span></button>
          <button class="item-btn" data-a="sm" aria-label="Summon">${icon('fx_summon', 'rh-ico')}<span data-k="sc"></span></button>
        </div>`;
      bindActions(this.el, (a, el) => this.action(a, el));
    }
    const q = (k: string) => this.el.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    // no clock, like the original: only in the last minute does a "heading home" countdown show
    const left = Math.max(0, RAID_TIME - r.t);
    q('timer').style.display = left <= 60 && r.phase === 'fight' ? '' : 'none';
    q('timer').textContent = `Home in ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    q('timer').classList.toggle('urgent', left < 20);
    const squad = r.units.filter((u) => u.side === 'z');
    const sel = ctl.raidSel;
    const tray = squad
      .map((u) => {
        const f = Math.max(0, u.hp / u.maxHp);
        return `<button class="tray-u ${u.state === 'queued' ? 'queued' : u.hp <= 0 ? 'ko' : ''} ${sel === u.id ? 'on' : ''}" data-u="${u.id}"><img src="${headUrl(u.art, u.hp <= 0 ? 'dazed' : undefined)}" alt=""/><i style="width:${f * 100}%"></i></button>`;
      })
      .join('');
    if (q('tray').dataset.v !== tray) {
      q('tray').dataset.v = tray;
      q('tray').innerHTML = tray;
      q('tray')
        .querySelectorAll<HTMLElement>('[data-u]')
        .forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            const id = b.dataset.u!;
            const u = r.units.find((x) => x.id === id);
            if (!u || u.hp <= 0) return;
            sfx('groan', { pitch: 0.8 + Math.random() * 0.4 });
            ctl.selectRaider(ctl.raidSel === id ? null : id);
          };
        });
    }
    const fighting = r.phase === 'fight';
    const queued = squad.some((u) => u.state === 'queued');
    q('sendall').style.display = queued && fighting ? '' : 'none';
    q('attack').style.display = sel && fighting ? '' : 'none';
    q('hint').textContent = !fighting ? '' : sel ? 'Now tap a target, the counter, or ATTACK.' : queued ? 'Tap a zombie in line, then a target. Or ATTACK ALL. Gus says: clear the waiters first, stay out of the kitchen!' : '';
    q('loot').innerHTML = `${priceHtml({ cash: r.cashEaten })}${r.stolen.map((d) => `<img class="ico" src="${artUrl(DISH_BY_ID[d].icon)}" alt=""/>`).join('')}`;
    for (const f of stones) {
      const n = this.el.querySelector<HTMLElement>(`[data-k="st${f.id}"]`);
      if (n) n.textContent = String(tombstoneUses(s, f));
      const boost = ITEM_BY_ID[f.item].boost;
      n?.parentElement?.classList.toggle('glow', !!r.buff && r.t < r.buff.until && boost === r.buff.kind);
    }
    q('hc').textContent = String(s.inventory.headstone);
    q('hc').parentElement?.classList.toggle('glow', !!r.heal && r.t < r.heal.until);
    q('sc').textContent = String(s.inventory.summon);
    if (fighting) this.endAt = 0;
    else if (!ctl.raidResult) {
      // let the final KO / retreat play out for a beat before the results card
      if (!this.endAt) this.endAt = performance.now();
      else if (performance.now() - this.endAt > RESULT_SHOW_MS) this.showResult();
    }
  }

  private action(a: string, el: HTMLElement) {
    const ctl = this.hud.ctl;
    const r = ctl.raid;
    if (!r || r.phase !== 'fight') return;
    const s = ctl.state;
    let err: string | null = null;
    if (a === 'flag') {
      retreat(r);
      return;
    }
    if (a === 'sendall') {
      err = sendAll(r);
      if (!err) sfx('groan', { pitch: 0.7 });
      ctl.selectRaider(null);
    }
    if (a === 'attack' && ctl.raidSel) {
      err = order(r, ctl.raidSel, { kind: 'attack' });
      if (!err) sfx('groan', { pitch: 0.8 });
      ctl.selectRaider(null);
    }
    if (a === 'stone') err = useTombstone(s, r, el.dataset.id!);
    if (a === 'hs') err = useHeadstone(s, r);
    if (a === 'sm') err = useSummon(s, r);
    if (err) ctl.toast(err);
  }

  private showResult() {
    const ctl = this.hud.ctl;
    const res = ctl.endRaid();
    if (!res) return;
    const endedAt = this.endAt || performance.now();
    this.endAt = 0;
    this.hud.clearToasts();
    const r = ctl.raid!;
    const def = RIVAL_BY_ID[r.rival];
    const title = res.result === 'won' ? 'VICTORY!' : res.result === 'retreat' ? 'RETREAT!' : 'DEFEAT!';
    const timedOut = res.result === 'retreat' && r.t >= RAID_TIME;
    const flavor =
      res.result === 'won'
        ? `${def.chef} is down for the count!`
        : timedOut
          ? 'The squad got bored of the standoff and shuffled home.'
          : res.result === 'retreat'
            ? 'You ran for it. Smart. Cowardly, but smart.'
            : `${def.chef} sent your crew packing.`;
    // the chef has the last word: a groan when beaten, a gloat when you lose
    const line = res.result === 'won' ? def.defeat : res.result === 'lost' ? def.victory : '';
    const i = ROAD.findIndex((x) => x.id === r.rival);
    const next = i >= 0 && i + 1 < ROAD.length ? ROAD[i + 1] : undefined;
    const m = this.hud.openModal(
      `<div class="burst ${res.result}"><h2 class="big">${title}</h2></div><p>${esc(flavor)}</p>
      ${line ? `<p class="quote">${esc(def.chef)}: “${esc(line)}”</p>` : ''}
      ${res.stars ? `<div class="stars big-stars">${stars3(res.stars)}</div>` : ''}
      <div class="unlocks">
        <div>${priceHtml({ cash: res.cash })} cash${res.eaten ? ` · ${res.eaten} eaten` : ''}</div>
        ${res.xp ? `<div>+${res.xp} XP</div>` : ''}
        ${res.sauce ? `<div>${priceHtml({ sauce: res.sauce })} Brain Sauce from the Head Chef!</div>` : ''}
        ${res.dishes
          .map(
            (d, i) =>
              `<div><img class="ico" src="${artUrl(DISH_BY_ID[d].icon)}" alt=""/> ${esc(DISH_BY_ID[d].name)} ×${res.servings[i]} → Fridge${res.recipeDrop === d ? ' (study it for the recipe!)' : DISH_BY_ID[d].variant ? ' (RARE! UNLOCK it in the Fridge)' : ''}</div>`,
          )
          .join('')}
        ${res.kos.length ? `<div class="warn">KO’d: ${res.kos.map(esc).join(', ')} (they reanimate in an hour, or revive them with Brain Sauce)</div>` : ''}
      </div>
      <div class="actions"><button class="btn" data-a="again" disabled>Raid again</button>${next ? '<button class="btn" data-a="next" disabled>Next joint</button>' : ''}<button class="btn green big-btn" data-a="home" disabled>Back to the joint</button></div>`,
      { cls: 'narrow', noClose: true },
    );
    // like the original's reward screen, it stays up a few seconds before you can dismiss it
    const btns = [...m.querySelectorAll<HTMLButtonElement>('.actions button')];
    const home = m.querySelector<HTMLButtonElement>('[data-a="home"]')!;
    const tick = () => {
      const wait = REWARD_DELAY_MS - (performance.now() - endedAt);
      if (!home.isConnected) return;
      if (wait <= 0) {
        for (const b of btns) b.disabled = false;
        home.textContent = 'Back to the joint';
        return;
      }
      home.textContent = `Back to the joint (${Math.ceil(wait / 1000)})`;
      setTimeout(tick, Math.min(250, wait));
    };
    tick();
    const rival = r.rival;
    bindActions(m, (a) => {
      this.hud.closeModal();
      ctl.leaveRaid();
      music('joint');
      // straight back to the road: the same joint's card, or the next one along
      if (a === 'again') openRivalCard(this.hud, rival);
      if (a === 'next' && next) openRivalCard(this.hud, next.id);
    });
  }
}
