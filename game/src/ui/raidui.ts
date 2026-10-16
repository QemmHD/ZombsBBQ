import { MAP_LAYOUT } from '../art';
import {
  DISH_BY_ID,
  HEADSTONE_COST,
  RAID_TIME,
  RIVALS,
  RIVAL_BY_ID,
  SUMMON_COST,
  buyHeadstone,
  buySummon,
  raidCandidates,
  refreshDaily,
  retreat,
  rivalReady,
  rivalUnlocked,
  sendAll,
  useGreen,
  useHeadstone,
  useRed,
  useSummon,
  type RivalId,
} from '../sim';
import { music, sfx } from '../game/sfx';
import { artUrl, headUrl } from '../scenes/assets';
import { charIdFor } from '../scenes/JointScene';
import type { Hud } from './hud';
import { bindActions, energyColor, esc, fmt, icon, priceHtml, starsHtml } from './dom';

// ---------- the road-trip map ----------

export function openMap(hud: Hud) {
  const s = hud.ctl.state;
  music('map');
  const pins = RIVALS.map((r) => {
    const pos = MAP_LAYOUT[r.id];
    const unlocked = rivalUnlocked(s, r.id);
    const prog = s.rivals[r.id];
    return `<button class="map-pin ${unlocked ? '' : 'locked'}" style="left:${(pos.x / 1600) * 100}%;top:${(pos.y / 900) * 100}%" data-a="rival" data-id="${r.id}">
      <img src="${artUrl(`map_joint_${r.id}`)}" alt=""/><span class="pin-label">${unlocked ? '' : icon('fx_lock', 'ico-s')}LV ${r.level}${prog?.wins ? ` ${starsHtml(prog.stars).replace(/★/g, '★')}` : ''}</span></button>`;
  }).join('');
  const home = MAP_LAYOUT.home;
  const m = hud.openModal(
    `<div class="map-wrap"><img class="map-bg" src="${artUrl('map_bg')}" alt="Road trip map"/>
      <div class="map-pin home" style="left:${(home.x / 1600) * 100}%;top:${(home.y / 900) * 100}%"><img src="${artUrl('map_home')}" alt=""/><span class="pin-label">YOUR JOINT</span></div>
      ${pins}</div>`,
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
  const sig = DISH_BY_ID[r.signature];
  const m = hud.openModal(
    `<div class="rival-head"><img src="${headUrl(`boss_${id}`)}" alt=""/><div><h2>${esc(r.name)}</h2><div class="sub">Head Chef: ${esc(r.chef)} · Level ${r.level}</div>${prog?.wins ? `<div class="stars">${starsHtml(prog.stars)}</div>` : ''}</div></div>
    <p class="quote">“${esc(r.taunt)}”</p>
    <div class="chips"><span class="chip">${r.staff.count} waiters</span>${r.dogs ? `<span class="chip">${r.dogs} guard dog${r.dogs > 1 ? 's' : ''}</span>` : ''}${r.zappers ? `<span class="chip">${r.zappers} bug zapper${r.zappers > 1 ? 's' : ''}</span>` : ''}<span class="chip">Gate ${r.gateHp} HP</span><span class="chip">Boss ${r.boss.hp} HP</span></div>
    <div class="loot-row"><span>Win:</span> ${priceHtml({ cash: r.reward.cash })} <span>+${r.reward.xp} XP</span> <img class="ico" src="${artUrl(sig.icon)}" alt=""/> <span>${esc(sig.name)} recipe${s.recipes.includes(sig.id) ? ' (known)' : ''}</span> <span>${icon('ui_sauce', 'ico-s')} maybe</span></div>
    <div class="actions"><button class="btn" data-a="back">${icon('ui_raid', 'ico-s')} Map</button><button class="btn red big-btn" data-a="go" ${err ? 'disabled' : ''}>RAID!</button></div>
    ${err ? `<p class="small warn">${esc(err)}</p>` : '<p class="small">Pick your squad next. Energy is health in a fight!</p>'}`,
    { cls: 'narrow', onClose: () => hud.ctl.mode === 'play' && music('joint') },
  );
  bindActions(m, (a) => {
    if (a === 'back') openMap(hud);
    if (a === 'go') openSquad(hud, id);
  });
}

function openSquad(hud: Hud, id: RivalId, picked?: Set<string>, pets?: Set<string>) {
  const s = hud.ctl.state;
  const cands = raidCandidates(s).filter((w) => w.kind === 'zombie' || w.kind === 'you');
  picked ??= new Set(cands.filter((w) => w.kind === 'zombie' && w.energy > w.stats.energy * 0.5).map((w) => w.id));
  pets ??= new Set(s.pets.map((p) => p.id));
  refreshDaily(s);
  const tiles = cands
    .map((w) => {
      const f = w.energy / w.stats.energy;
      return `<button class="squad-tile ${picked!.has(w.id) ? 'on' : ''}" data-a="toggle" data-id="${w.id}"><img src="${headUrl(charIdFor(w))}" alt=""/><b>${esc(w.name)}</b><span class="bar"><i style="width:${f * 100}%;background:${energyColor(f)}"></i></span><span class="sub">PWR ${w.stats.power} · ${Math.floor(w.energy)} HP</span></button>`;
    })
    .join('');
  const petTiles = s.pets
    .map((p) => `<button class="squad-tile ${pets!.has(p.id) ? 'on' : ''}" data-a="pet" data-id="${p.id}"><img src="${headUrl(p.type === 'pug' ? 'pet_pug' : 'pet_rotweiler')}" alt=""/><b>${p.type === 'pug' ? 'Zombie Pug' : 'Rot-weiler'}</b><span class="sub">Pet</span></button>`)
    .join('');
  const m = hud.openModal(
    `<h2>Pick your squad · ${esc(RIVAL_BY_ID[id].name)}</h2>
    <div class="squad">${tiles || '<p>No one’s free! Zombies who are cooking or knocked out can’t come.</p>'}${petTiles}</div>
    <div class="kit"><span>${icon('fx_grave_green', 'ico')} ×${s.graves.green} ${icon('fx_grave_red', 'ico')} ×${s.graves.red} (free daily)</span>
      <button class="btn tiny" data-a="buyhs">${icon('fx_headstone', 'ico-s')} Headstone ×${s.inventory.headstone} · +1 ${priceHtml({ cash: HEADSTONE_COST })}</button>
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
    if (a === 'buyhs' || a === 'buysm') {
      const err = a === 'buyhs' ? buyHeadstone(s) : buySummon(s);
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

// ---------- in-raid HUD ----------

export class RaidUi {
  private built = '';
  constructor(
    private hud: Hud,
    private el: HTMLElement,
  ) {
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  refresh() {
    const r = this.hud.ctl.raid;
    if (!r) {
      this.el.innerHTML = '';
      this.built = '';
      return;
    }
    const s = this.hud.ctl.state;
    const def = RIVAL_BY_ID[r.rival];
    if (this.built !== `${r.rival}${r.units.length}`) {
      this.built = `${r.rival}${r.units.length}`;
      this.el.innerHTML = `
        <div class="rh-top"><button class="flag-btn" data-a="flag" aria-label="Retreat">${icon('fx_flag', 'rh-ico')}</button>
          <div class="rh-name"><b>${esc(def.name)}</b><span class="sub">LV ${def.level} · Beat ${esc(def.chef)}!</span></div>
          <div class="rh-timer" data-k="timer"></div></div>
        <div class="rh-tray" data-k="tray"></div>
        <button class="btn red sendall" data-a="sendall">SEND ALL ZOMBIES</button>
        <div class="rh-loot" data-k="loot"></div>
        <div class="rh-items">
          <button class="item-btn" data-a="green">${icon('fx_grave_green', 'rh-ico')}<span data-k="gc"></span></button>
          <button class="item-btn" data-a="red">${icon('fx_grave_red', 'rh-ico')}<span data-k="rc"></span></button>
          <button class="item-btn" data-a="hs">${icon('fx_headstone', 'rh-ico')}<span data-k="hc"></span></button>
          <button class="item-btn" data-a="sm">${icon('fx_summon', 'rh-ico')}<span data-k="sc"></span></button>
        </div>`;
      bindActions(this.el, (a) => this.action(a));
    }
    const q = (k: string) => this.el.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    const left = Math.max(0, RAID_TIME - r.t);
    q('timer').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    q('timer').classList.toggle('urgent', left < 20);
    const horde = r.units.filter((u) => u.side === 'z');
    q('tray').innerHTML = horde
      .map((u) => {
        const f = Math.max(0, u.hp / u.maxHp);
        return `<div class="tray-u ${u.state === 'queued' ? 'queued' : u.hp <= 0 ? 'ko' : ''}"><img src="${headUrl(u.art, u.hp <= 0 ? 'dazed' : undefined)}" alt=""/><i style="width:${f * 100}%"></i></div>`;
      })
      .join('');
    const sendBtn = this.el.querySelector<HTMLElement>('.sendall')!;
    sendBtn.style.display = horde.some((u) => u.state === 'queued') && r.phase === 'fight' ? '' : 'none';
    q('loot').innerHTML = `${priceHtml({ cash: r.cashEaten })}${r.stolen.map((d) => `<img class="ico" src="${artUrl(DISH_BY_ID[d].icon)}" alt=""/>`).join('')}`;
    q('gc').textContent = String(s.graves.green);
    q('rc').textContent = String(s.graves.red);
    q('hc').textContent = String(s.inventory.headstone);
    q('sc').textContent = String(s.inventory.summon);
    if (r.phase !== 'fight' && !this.hud.ctl.raidResult) this.showResult();
  }

  private action(a: string) {
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
    }
    if (a === 'green') err = useGreen(s, r);
    if (a === 'red') err = useRed(s, r);
    if (a === 'hs') err = useHeadstone(s, r);
    if (a === 'sm') err = useSummon(s, r);
    if (err) ctl.toast(err);
  }

  private showResult() {
    const ctl = this.hud.ctl;
    const res = ctl.endRaid();
    if (!res) return;
    const r = ctl.raid!;
    const def = RIVAL_BY_ID[r.rival];
    const title = res.result === 'won' ? 'VICTORY!' : res.result === 'retreat' ? 'RETREAT!' : 'DEFEAT!';
    const flavor = res.result === 'won' ? `${def.chef} is down for the count!` : res.result === 'retreat' ? 'You ran for it. Smart. Cowardly, but smart.' : `${def.chef} sent your crew packing.`;
    const m = this.hud.openModal(
      `<div class="burst ${res.result}"><h2 class="big">${title}</h2></div><p>${esc(flavor)}</p>
      ${res.stars ? `<div class="stars big-stars">${starsHtml(res.stars)}</div>` : ''}
      <div class="unlocks">
        <div>${priceHtml({ cash: res.cash })} cash</div>
        ${res.xp ? `<div>+${res.xp} XP</div>` : ''}
        ${res.sauce ? `<div>${priceHtml({ sauce: res.sauce })} Brain Sauce from the Head Chef!</div>` : ''}
        ${res.dishes.map((d) => `<div><img class="ico" src="${artUrl(DISH_BY_ID[d].icon)}" alt=""/> ${esc(DISH_BY_ID[d].name)} → Fridge${res.recipeDrop === d ? ' (study it for the recipe!)' : ''}</div>`).join('')}
        ${res.kos.length ? `<div class="warn">KO’d: ${res.kos.map(esc).join(', ')} (back in 15 min, or revive with Brain Sauce)</div>` : ''}
      </div>
      <div class="actions"><button class="btn green big-btn" data-a="home">Back to the joint</button></div>`,
      { cls: 'narrow', noClose: true },
    );
    bindActions(m, () => {
      this.hud.closeModal();
      ctl.leaveRaid();
      music('joint');
    });
    void fmt;
  }
}
