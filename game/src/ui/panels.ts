import {
  CUSTOMERS,
  DISHES,
  DISH_BY_ID,
  EXPANSIONS,
  ITEMS,
  activeGoals,
  claimGoal,
  grimeCount,
  maxEnergy,
  ratingBonus,
  serveFromFridge,
  stars,
  studyFromFridge,
  zombies,
  RIVALS,
  crewCapForLevel,
  WALL_FINISHES,
  FLOOR_FINISHES,
  type WorkerState,
} from '../sim';
import { audio, sfx } from '../game/sfx';
import { headUrl, artUrl } from '../scenes/assets';
import { charIdFor } from '../scenes/JointScene';
import type { Hud } from './hud';
import { bindActions, energyColor, esc, fmtTime, icon, priceHtml, starsHtml } from './dom';
import { dishRow } from './hud';
import { itemThumb } from './store';

declare const __BUILD__: string;

export function openSettings(hud: Hud) {
  const render = () => {
    const m = hud.openModal(
      `<h2>${icon('ui_settings', 'h-ico')} Settings</h2>
      <div class="set-row"><span>Sound effects</span><input type="range" min="0" max="1" step="0.05" value="${audio.sfxVolume}" data-k="sfx" aria-label="Sound effects volume"/></div>
      <div class="set-row"><span>Music</span><input type="range" min="0" max="1" step="0.05" value="${audio.musicVolume}" data-k="music" aria-label="Music volume"/></div>
      <div class="actions"><button class="btn ${audio.muted ? 'green' : 'blue'}" data-a="mute">${icon(audio.muted ? 'ui_sound_off' : 'ui_sound_on', 'ico-s')} ${audio.muted ? 'Unmute' : 'Mute all'}</button></div>
      <div class="actions"><button class="btn red" data-a="reset">Start a new joint</button></div>
      <p class="small">Your progress saves on this device automatically. Zombs BBQ · build ${__BUILD__}</p>`,
      { cls: 'narrow' },
    );
    m.querySelector<HTMLInputElement>('[data-k="sfx"]')!.oninput = (e) => {
      audio.setSfxVolume(Number((e.target as HTMLInputElement).value));
      sfx('coin');
    };
    m.querySelector<HTMLInputElement>('[data-k="music"]')!.oninput = (e) => audio.setMusicVolume(Number((e.target as HTMLInputElement).value));
    bindActions(m, (a, el) => {
      if (a === 'mute') {
        audio.setMuted(!audio.muted);
        render();
      }
      if (a === 'reset') {
        if (el.dataset.armed) {
          hud.ctl.reset();
          hud.closeModal();
          hud.ctl.info('Fresh joint, fresh start. Grab the tongs!');
          return;
        }
        el.dataset.armed = '1';
        el.textContent = 'Tap again to wipe your joint';
      }
    });
  };
  render();
}

export function openCookbook(hud: Hud) {
  const s = hud.ctl.state;
  const section = (title: string, ids: string[]) => `<h4>${title}</h4>${ids.map((id) => dishRow(id, s, false)).join('')}`;
  const by = (st: string) => DISHES.filter((d) => d.station === st).map((d) => d.id);
  hud.openModal(
    `<h2>${icon('ui_menu', 'h-ico')} Cookbook</h2><div class="list">${section('Stove (the house menu)', by('stove'))}${section('BBQ Grill', by('grill'))}${section('Smoker', by('smoker'))}${section('Deep Fryer', by('fryer'))}</div>
    <p class="small">Tap a cook, then a stove, to cook. Stolen recipes come from raids: study them in the Fridge.</p>`,
  );
}

const STATUS: Record<WorkerState, string> = {
  idle: 'Ready for orders',
  toStove: 'Heading to a stove',
  cooking: 'Cooking',
  toPickup: 'Fetching a finished dish',
  carryDish: 'Carrying food to the counter',
  toCounter: 'Plating up',
  carrying: 'Carrying food',
  toPlate: 'Clearing a table',
  carryPlate: 'Dumping plates in the sink',
  hunting: 'HANGRY! Hunting a snack',
  toRest: 'Off for a nap',
  resting: 'Napping outside',
  daydream: 'Daydreaming about brains',
  raiding: 'Out raiding',
  down: 'Knocked out',
};

export function openCrew(hud: Hud) {
  const s = hud.ctl.state;
  const rows = s.workers
    .map((w) => {
      const f = w.energy / maxEnergy(w);
      const status = w.state === 'down' ? `KO · back in ${fmtTime((w.downUntil ?? 0) - s.now)}` : STATUS[w.state];
      return `<div class="crew-row" data-id="${w.id}"><img src="${headUrl(charIdFor(w), w.state === 'down' ? 'dazed' : undefined)}" alt=""/><b>${esc(w.name)}<br/><span class="sub">${esc(status)}</span></b><div class="bar"><i style="width:${f * 100}%;background:${energyColor(f)}"></i></div><span class="chip">PWR ${w.stats.power}</span></div>`;
    })
    .join('');
  const m = hud.openModal(`<h2>${icon('ui_crew', 'h-ico')} Crew ${zombies(s).length}/${s.crewCap}</h2><div class="list">${rows}</div><p class="small">Infect customers to grow the crew. Level up for more slots. Tap someone to see their card (and fire them if you need the space).</p>`);
  m.querySelectorAll<HTMLElement>('.crew-row').forEach((r) => {
    r.onclick = () => {
      hud.closeModal();
      hud.ctl.tapWorker(r.dataset.id!);
    };
  });
}

export function openGoals(hud: Hud) {
  const render = () => {
    const s = hud.ctl.state;
    const goals = activeGoals(s);
    const reward = (r: { cash?: number; sauce?: number; xp?: number }) =>
      [r.cash ? priceHtml({ cash: r.cash }) : '', r.sauce ? priceHtml({ sauce: r.sauce }) : '', r.xp ? `+${r.xp} XP` : ''].filter(Boolean).join(' ');
    const rows = goals.length
      ? goals
          .map(
            (g) => `<div class="goal ${g.done ? 'done' : ''}"><span class="check">${g.done ? icon('ui_check', 'ico') : ''}</span><b>${esc(g.text)}</b><span class="reward">${reward(g.reward)}</span>
            ${g.done ? `<button class="btn green" data-a="claim" data-id="${g.id}">Claim</button>` : ''}</div>`,
          )
          .join('')
      : '<p>You’ve done it all, Boss. The undead salute you.</p>';
    const m = hud.openModal(`<h2>${icon('ui_goals', 'h-ico')} Gus’s Clipboard</h2><div class="list">${rows}</div><p class="small">${s.goalsDone.length} goals done. Finish one to see the next.</p>`);
    bindActions(m, (a, el) => {
      if (a !== 'claim') return;
      const err = claimGoal(s, el.dataset.id!);
      if (err) hud.ctl.toast(err);
      else {
        sfx('cashRegister');
        render();
      }
    });
  };
  render();
}

export function openFridge(hud: Hud) {
  const render = () => {
    const s = hud.ctl.state;
    const rows = s.fridge.length
      ? s.fridge
          .map((it, i) => {
            const d = DISH_BY_ID[it.dish];
            const canStudy = d.source === 'raid' && !s.recipes.includes(d.id);
            return `<div class="fridge-row"><img src="${artUrl(d.icon)}" alt=""/><b>${esc(d.name)}<br/><span class="sub">${it.servings} servings${d.source === 'raid' ? ' · STOLEN' : ''}</span></b>
              <button class="btn" data-a="serve" data-i="${i}">Serve</button>${canStudy ? `<button class="btn green" data-a="study" data-i="${i}">Study</button>` : ''}</div>`;
          })
          .join('')
      : `<p>Empty. Raid rival joints and swipe their food: it lands in here.</p>`;
    const m = hud.openModal(`<h2>${icon('ui_fridge', 'h-ico')} The Fridge</h2><div class="list">${rows}</div><p class="small">Serve puts the food on your counter. Study a stolen dish to learn its secret recipe for good.</p>`);
    bindActions(m, (a, el) => {
      const i = Number(el.dataset.i);
      const err = a === 'serve' ? serveFromFridge(s, i) : studyFromFridge(s, i);
      if (err) hud.ctl.toast(err);
      else {
        sfx(a === 'study' ? 'levelUp' : 'plate');
        if (a === 'study') hud.ctl.info('New recipe learned! Check the Cookbook.');
        render();
      }
    });
  };
  render();
}

export function openZombiepedia(hud: Hud) {
  const s = hud.ctl.state;
  const cards = CUSTOMERS.map((c) => {
    const seen = s.seen[c.id];
    if (!seen)
      return `<div class="pedia-card unknown"><div class="pedia-heads"><img src="${headUrl(c.id)}" alt="" class="silhouette"/></div><b>???</b><span class="sub">Level ${c.minLevel} · ${c.minStars}★</span></div>`;
    return `<div class="pedia-card"><div class="pedia-heads"><img src="${headUrl(c.id)}" alt=""/><img src="${headUrl(`${c.id}_z`)}" alt=""/></div><b>${esc(c.name)}</b><span class="tier ${c.tier}">${c.tier}</span><span class="sub">${seen === 'infected' ? `${esc(c.zombieName)}: ${esc(c.gag)}` : 'Met, not yet infected'}</span><span class="sub">PWR ${c.stats.power} · TIPS ${c.stats.tips} · ${c.infect.sauce ? priceHtml({ sauce: c.infect.sauce }) : c.infect.cash ? priceHtml({ cash: c.infect.cash }) : 'free'}</span></div>`;
  }).join('');
  const met = CUSTOMERS.filter((c) => s.seen[c.id]).length;
  hud.openModal(`<h2>${icon('ui_zombiepedia', 'h-ico')} Zombiepedia <span class="sub">${met}/${CUSTOMERS.length} met</span></h2><div class="pedia">${cards}</div><p class="small">Who shows up depends on your level and star rating. Rare customers get common once your stars beat their requirement.</p>`, { cls: 'wide' });
}

export function openLevelUp(hud: Hud, from: number, level = from) {
  const unlocks: string[] = [];
  for (let l = from; l < level; l++) collectUnlocks(l, unlocks);
  collectUnlocks(level, unlocks);
  hud.openModal(
    `<div class="burst"><h2 class="big">LEVEL ${level}!</h2></div>${unlocks.length ? `<div class="unlocks">${unlocks.map((u) => `<div>${u}</div>`).join('')}</div>` : '<p>The joint grows more infamous…</p>'}<div class="actions"><button class="btn green" data-close>Sweet!</button></div>`,
    { cls: 'narrow' },
  );
}

function collectUnlocks(level: number, unlocks: string[]) {
  const slots = crewCapForLevel(level) - crewCapForLevel(level - 1);
  if (slots > 0) unlocks.push(`${icon('ui_crew', 'ico')} +${slots} crew slot${slots > 1 ? 's' : ''}`);
  for (const d of DISHES) if (d.source === 'level' && d.level === level) unlocks.push(`${icon(d.icon, 'ico')} ${d.name}`);
  for (const it of ITEMS) if (it.level === level) unlocks.push(`<img class="unl-ico" src="${itemThumb(it)}" alt=""/> ${it.name}`);
  for (const t of [...WALL_FINISHES, ...FLOOR_FINISHES]) if (t.level === level && t.cash > 0) unlocks.push(`${t.name}`);
  for (const c of CUSTOMERS) if (c.minLevel === level) unlocks.push(`<img class="ico" src="${headUrl(c.id)}" alt=""/> ${c.name} may visit`);
  for (const e of EXPANSIONS) if (e.level === level && level > 1) unlocks.push(`${icon('ui_expand', 'ico')} Expand to ${e.w}×${e.h}`);
  for (const r of RIVALS) if (r.level === level) unlocks.push(`${icon('ui_raid', 'ico')} Raid ${r.name}`);
  if (level === 2) unlocks.push(`${icon('ui_raid', 'ico')} The raid map!`);
}

export function openOffline(hud: Hud, r: { sec: number; cash: number }) {
  hud.openModal(
    `<h2>Welcome back, Boss!</h2><p>The crew kept the joint running for ${fmtTime(r.sec)}${r.sec >= 8 * 3600 ? ' (8h max)' : ''}.</p><p class="big-num">${priceHtml({ cash: Math.max(0, r.cash) })}</p>${r.cash <= 0 ? '<p class="small">Tip: stack the counter with food before you go. The crew serves whatever’s there while you’re away.</p>' : ''}<div class="actions"><button class="btn green" data-close>Let’s cook</button></div>`,
    { cls: 'narrow' },
  );
}

/** Star rating breakdown (tap the stars). */
export function openRating(hud: Hud) {
  const s = hud.ctl.state;
  const bonus = ratingBonus(s);
  const grime = grimeCount(s);
  const pct = Math.round(s.rating * 100);
  hud.openModal(
    `<h2>Star Rating</h2><div class="rate-row"><span class="big-stars">${starsHtml(stars(s))}</span><span class="sub">Popularity ${pct}%</span></div>
    <div class="rate-row"><b>Customers</b><span class="sub">Every happy customer pushes it up. Customers who wait too long, find no clean table, or get eaten drag it down.</span></div>
    <div class="rate-row"><b>Star items ${bonus >= 0 ? '+' : ''}${Math.round(bonus * 100)}★</b><span class="sub">Fancy items make the rating climb faster and fall slower.${grime ? ` ${grime} grimy thing${grime > 1 ? 's' : ''} (stains, loose tiles, old kit) hold you back.` : ''}</span></div>
    ${s.closed ? '<p class="small">You’re CLOSED: the rating slowly sags until you open again.</p>' : ''}
    <p class="small">More stars bring more customers, and rarer ones.</p>`,
    { cls: 'narrow' },
  );
}
