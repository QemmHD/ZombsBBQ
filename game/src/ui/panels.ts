import {
  CUSTOMERS,
  DISHES,
  DISH_BY_ID,
  EXPANSIONS,
  ITEMS,
  activeGoals,
  bribeTodo,
  canStudy,
  claimGoal,
  purpleLeft,
  purpleStars,
  todoDone,
  todoProgress,
  todoText,
  withLearnedVariants,
  PURPLE,
  STATIONS,
  chefRank,
  FRYER_REWARDS,
  TUNING,
  VARIANT_BY_ID,
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
  CHEFS,
  LOCKER,
  NAME_MAX,
  binFridge,
  buyHooks,
  chefOf,
  chefStats,
  criticReview,
  jointName,
  lockerOf,
  renameJoint,
  setChef,
  skipTodo,
  takeFromLocker,
  upcomingAlerts,
  zombieLevel,
  type AwayReport,
  type WorkerState,
} from '../sim';
import { audio, sfx } from '../game/sfx';
import { headUrl, artUrl } from '../scenes/assets';
import { charIdFor } from '../scenes/JointScene';
import type { Hud } from './hud';
import { bindActions, energyColor, esc, fmtTime, icon, priceHtml, purpleStarsHtml, star, starsHtml } from './dom';
import { dishRow } from './hud';
import { itemThumb } from './store';

declare const __BUILD__: string;

export function openSettings(hud: Hud) {
  const render = () => {
    const m = hud.openModal(
      `<h2>${icon('ui_settings', 'h-ico')} Settings</h2>
      <div class="set-row"><span>Sound effects</span><input type="range" min="0" max="1" step="0.05" value="${audio.sfxVolume}" data-k="sfx" aria-label="Sound effects volume"/></div>
      <div class="set-row"><span>Music</span><input type="range" min="0" max="1" step="0.05" value="${audio.musicVolume}" data-k="music" aria-label="Music volume"/></div>
      <div class="actions"><button class="btn ${audio.muted ? 'green' : 'blue'}" data-a="mute">${icon(audio.muted ? 'ui_sound_off' : 'ui_sound_on', 'ico-s')} ${audio.muted ? 'Unmute' : 'Mute all'}</button><button class="btn" data-a="chef">Chef: ${esc(chefOf(hud.ctl.state).name)}</button><button class="btn" data-a="rename">Rename joint</button></div>
      <div class="set-row"><span>Union break<br/><small class="sub">While you’re away, tired zombies nap instead of biting</small></span><input type="checkbox" data-k="union" ${hud.ctl.state.unionBreak === false ? '' : 'checked'} aria-label="Union break"/></div>
      ${alertsHtml(hud)}
      <div class="actions"><button class="btn red" data-a="reset">Start a new joint</button></div>
      <p class="small">Your progress saves on this device automatically. Zombs BBQ · build ${__BUILD__}</p>`,
      { cls: 'narrow' },
    );
    m.querySelector<HTMLInputElement>('[data-k="sfx"]')!.oninput = (e) => {
      audio.setSfxVolume(Number((e.target as HTMLInputElement).value));
      sfx('coin');
    };
    m.querySelector<HTMLInputElement>('[data-k="music"]')!.oninput = (e) => audio.setMusicVolume(Number((e.target as HTMLInputElement).value));
    m.querySelector<HTMLInputElement>('[data-k="union"]')!.onchange = (e) => {
      hud.ctl.setUnionBreak((e.target as HTMLInputElement).checked);
      sfx('tap');
    };
    bindActions(m, (a, el) => {
      if (a === 'mute') {
        audio.setMuted(!audio.muted);
        render();
      }
      if (a === 'chef') return openChefPicker(hud);
      if (a === 'rename') return openRename(hud);
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
  // learned rare variants sit right under the dish they're made from
  const by = (st: string) => withLearnedVariants(s, DISHES.filter((d) => d.station === st)).map((d) => d.id);
  const rk = chefRank(s);
  const rank = `<div class="chef-rank"><b>${esc(rk.title)}</b> <span class="sub">Chef rank ${rk.rank}/10 · ${rk.known} recipes known</span>${
    rk.next ? `<div class="bar"><i style="width:${Math.min(100, (rk.known / rk.next.at) * 100)}%"></i></div><span class="sub">Next: ${esc(rk.next.title)} at ${rk.next.at} recipes (+${rk.next.xp} XP)</span>` : ''
  }</div>`;
  hud.openModal(
    `<h2>${icon('ui_menu', 'h-ico')} Cookbook</h2>${rank}<div class="list">${STATIONS.map((st) => section(`${st.name} (${st.book})`, by(st.kind))).join('')}</div>
    <p class="small">Tap a cook, then a stove, to cook. Stolen recipes come from raids: study them in the Fridge. Swiped food sometimes comes home as a rare Bulk, Quick, Spicy, Fancy, Frozen or Fresh variant: UNLOCK it in the Fridge.</p>`,
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
  feasting: 'Feasting on a customer',
  toRest: 'Off for a nap',
  resting: 'Napping outside',
  daydream: 'Daydreaming about brains',
  hungry: 'HUNGRY! About to bite',
  asleep: 'Passed out (no energy)',
  raiding: 'Out raiding',
  down: 'Knocked out',
};

export function openCrew(hud: Hud) {
  const s = hud.ctl.state;
  const rows = s.workers
    .map((w) => {
      const f = w.energy / maxEnergy(w);
      const status = w.state === 'down' ? `KO · back in ${fmtTime((w.downUntil ?? 0) - s.now)}` : STATUS[w.state];
      const lv = w.kind === 'zombie' ? `<span class="chip">LV ${zombieLevel(w.xp)}</span>` : '';
      return `<div class="crew-row" data-id="${w.id}"><img src="${headUrl(charIdFor(w), w.state === 'down' ? 'dazed' : undefined)}" alt=""/><b>${esc(w.name)}<br/><span class="sub">${esc(status)}</span></b><div class="bar"><i style="width:${f * 100}%;background:${energyColor(f)}"></i></div>${lv}<span class="chip">PWR ${w.stats.power}</span></div>`;
    })
    .join('');
  const tired = zombies(s).filter((w) => w.energy < maxEnergy(w) * 0.5 && w.state !== 'resting' && w.state !== 'toRest' && w.state !== 'raiding' && w.state !== 'down').length;
  const m = hud.openModal(
    `<h2>${icon('ui_crew', 'h-ico')} Crew ${zombies(s).length}/${s.crewCap}</h2><div class="actions"><button class="btn blue" data-a="restall" ${tired ? '' : 'disabled'}>Rest the tired ones${tired ? ` (${tired})` : ''}</button>${s.locker?.zombies.length ? `<button class="btn" data-a="locker">Meat Locker (${s.locker.zombies.length})</button>` : ''}</div><div class="list">${rows}</div><p class="small">Infect customers to grow the crew. Level up for more slots. Tap someone to give orders.</p>`,
  );
  m.querySelectorAll<HTMLElement>('.crew-row').forEach((r) => {
    r.onclick = () => {
      hud.closeModal();
      hud.ctl.tapWorker(r.dataset.id!);
    };
  });
  bindActions(m, (a) => {
    if (a === 'restall') {
      hud.ctl.restAllTired();
      openCrew(hud);
    }
    if (a === 'locker') openLocker(hud);
  });
}

let goalsTab: 'goals' | 'todo' = 'goals';

/** Gus's to-do list (from level 6): four jobs, a purple bonus star when they're all done. */
function todoHtml(s: Parameters<typeof purpleStars>[0]): string {
  const p = purpleStars(s);
  const timer = p ? `<span class="sub">${p} purple star${p > 1 ? 's' : ''} · ${fmtTime(purpleLeft(s))} left</span>` : '<span class="sub">No purple stars yet</span>';
  const head = `<div class="purple-head"><span class="purple-row">${purpleStarsHtml(p)}${star('off').repeat(PURPLE.max - p)}</span>${timer}</div>`;
  if (s.level < PURPLE.level || !s.todo)
    return `${head}<div class="goal todo-locked"><span class="check">${icon('fx_lock', 'ico')}</span><b>Gus’s to-do list opens at level ${PURPLE.level}.<br/><span class="sub">Four quick jobs. Finish them all and the food critic drops by with a purple bonus star.</span></b></div>`;
  const rows = s.todo.tasks
    .map((t, i) => {
      const done = todoDone(s, t);
      const prog = todoProgress(s, t);
      return `<div class="goal todo ${done ? 'done' : ''}"><span class="check">${done ? icon('ui_check', 'ico') : ''}</span><b>${esc(todoText(t))}<br/><span class="sub">${t.bribed ? 'Reviewer bribed' : `${prog.toLocaleString('en-US')}/${t.target.toLocaleString('en-US')}`}</span></b>
        ${done ? '' : `${s.todo!.skipped ? '' : `<button class="btn" data-a="skip" data-i="${i}">Skip</button>`}<button class="btn sauce" data-a="bribe" data-i="${i}">Bribe ${priceHtml({ sauce: PURPLE.bribeSauce })}</button>`}</div>`;
    })
    .join('');
  const boost = Math.round(TUNING.purpleArrivalBoost * 100);
  return `${head}${rows}<p class="small">Finish all ${PURPLE.tasks} for a purple star (max ${PURPLE.max}). Each one: +${boost}% customers, +${Math.round(TUNING.purpleTipBoost * 100)}% tips, rarer visitors. The first lasts ${PURPLE.hours[0]} h, the next add ${PURPLE.hours[1]} h and ${PURPLE.hours[2]} h. Short on time? Bribe the reviewer, or Skip one job (once per list).</p>`;
}

export function openGoals(hud: Hud) {
  const render = () => {
    const s = hud.ctl.state;
    const tabs = `<div class="tabs"><button class="tab ${goalsTab === 'goals' ? 'on' : ''}" data-a="tab" data-id="goals">${icon('ui_goals', 'tab-ico')}<span>Clipboard</span></button><button class="tab ${goalsTab === 'todo' ? 'on' : ''}" data-a="tab" data-id="todo"><span class="tab-star">${star('purple')}</span><span>To-do${s.level < PURPLE.level ? ` ${icon('fx_lock', 'ico-s')}` : ''}</span></button></div>`;
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
    const body =
      goalsTab === 'todo' ? `<div class="list">${todoHtml(s)}</div>` : `<div class="list">${rows}</div><p class="small">${s.goalsDone.length} goals done. Finish one to see the next.</p>`;
    const m = hud.openModal(`<h2>${icon('ui_goals', 'h-ico')} Gus’s Clipboard</h2>${tabs}${body}`);
    bindActions(m, (a, el) => {
      if (a === 'tab') {
        sfx('page');
        goalsTab = el.dataset.id === 'todo' ? 'todo' : 'goals';
        render();
        return;
      }
      if (a === 'skip') {
        const err = skipTodo(s, Number(el.dataset.i));
        if (err) hud.ctl.toast(err);
        else {
          sfx('page');
          render();
        }
        return;
      }
      if (a === 'bribe') {
        const before = purpleStars(s);
        const err = bribeTodo(s, Number(el.dataset.i));
        if (err) hud.ctl.toast(err);
        else {
          sfx(purpleStars(s) !== before ? 'levelUp' : 'cashRegister');
          render();
        }
        return;
      }
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
            const v = d.variant ? VARIANT_BY_ID[d.variant] : undefined;
            const study = canStudy(s, d.id);
            const sub = v ? `RARE · ${v.effect}` : d.source === 'raid' ? 'STOLEN' : '';
            return `<div class="fridge-row ${v ? 'variant' : ''}"><span class="dish-ico"><img src="${artUrl(d.icon)}" alt=""/>${v ? `<i class="var-dot v-${v.id}">${v.name[0]}</i>` : ''}</span><b>${esc(d.name)}<br/><span class="sub">${it.servings} servings${sub ? ` · ${sub}` : ''}</span></b>
              <button class="btn" data-a="serve" data-i="${i}">Serve</button>${study ? `<button class="btn green" data-a="study" data-i="${i}">${v ? 'UNLOCK' : 'Study'}</button>` : ''}<button class="btn red tiny" data-a="bin" data-i="${i}">Bin</button></div>`;
          })
          .join('')
      : `<p>Empty. Raid rival joints and swipe their food: it lands in here.</p>`;
    const m = hud.openModal(
      `<h2>${icon('ui_fridge', 'h-ico')} The Fridge</h2><div class="list">${rows}</div><p class="small">${s.fridge.length}/${TUNING.fridgeMax} · Serve puts the food on your counter. Study a stolen dish to learn its secret recipe for good. UNLOCK a rare variant to cook it yourself. Bin makes room for raid loot.</p>`,
    );
    bindActions(m, (a, el) => {
      const i = Number(el.dataset.i);
      const name = DISH_BY_ID[s.fridge[i]?.dish]?.name ?? 'it';
      const err = a === 'serve' ? serveFromFridge(s, i) : a === 'bin' ? binFridge(s, i) : studyFromFridge(s, i);
      if (err) hud.ctl.toast(err);
      else {
        sfx(a === 'study' ? 'levelUp' : a === 'bin' ? 'burn' : 'plate');
        if (a === 'study') hud.ctl.info(`Learned ${name}! Check the Cookbook.`);
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

/** The Frequent Fryer: the first dish of the day keeps the cooking streak alive. */
export function openFryer(hud: Hud, e: { streak: number; reward: string; rare?: string }) {
  const day = ((e.streak - 1) % FRYER_REWARDS.length) + 1;
  const pips = FRYER_REWARDS.map((_, i) => `<i class="${i < day ? 'on' : ''}">${i + 1}</i>`).join('');
  const rare = e.rare ? `<p><b>RARE!</b> ${esc(DISH_BY_ID[e.rare].name)} is in the Fridge: study it!</p>` : '';
  hud.openModal(
    `<h2>Frequent Fryer</h2><p>Day ${e.streak} in a row at the stove!</p><div class="fryer-days">${pips}</div><p class="big-num">${esc(e.reward)}</p>${rare}<p class="small">Cook something every day to keep the streak. Ten days pays the most Brain Sauce, then it starts over.</p><div class="actions"><button class="btn green" data-close>Keep frying</button></div>`,
    { cls: 'narrow' },
  );
}

export function openOffline(hud: Hud, r: AwayReport | { sec: number; cash: number }) {
  const full = 'served' in r ? r : null;
  const line = (n: number, txt: string) => (n ? `<div class="away-row"><b>${n}</b> ${txt}</div>` : '');
  const delta = full ? (full.rating1 - full.rating0) * 5 : 0;
  const counts = full
    ? `<div class="away">${line(full.served, `customer${full.served === 1 ? '' : 's'} served`)}${line(full.angry, 'left unhappy')}${line(full.bitten, 'got bitten')}${line(full.burnt, `dish${full.burnt === 1 ? '' : 'es'} burnt`)}${
        Math.abs(delta) >= 0.05 ? `<div class="away-row"><b>${delta > 0 ? '+' : ''}${delta.toFixed(1)}★</b> rating</div>` : ''
      }</div>`
    : '';
  hud.openModal(
    `<h2>Welcome back, Boss!</h2><p>The crew kept the joint running for ${fmtTime(r.sec)}${r.sec >= 8 * 3600 ? ' (8h max)' : ''}.</p><p class="big-num">${priceHtml({ cash: Math.max(0, r.cash) })}</p>${counts}${r.cash <= 0 ? '<p class="small">Tip: stack the counter with food before you go. The crew serves whatever’s there while you’re away.</p>' : ''}<div class="actions"><button class="btn green" data-close>Let’s cook</button></div>`,
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
    `<h2>Star Rating</h2><div class="rate-row"><span class="big-stars">${starsHtml(stars(s))}${purpleStarsHtml(purpleStars(s))}</span><span class="sub">Popularity ${pct}%</span></div>
    <div class="rate-row"><b>Customers</b><span class="sub">Every happy customer pushes it up. Customers who wait too long, find no clean table, or get eaten drag it down.</span></div>
    <div class="rate-row"><b>Star items ${bonus >= 0 ? '+' : ''}${Math.round(bonus * 100)}★</b><span class="sub">Fancy items make the rating climb faster and fall slower.${grime ? ` ${grime} grimy thing${grime > 1 ? 's' : ''} (stains, loose tiles, old kit) hold you back.` : ''}</span></div>
    <div class="rate-row"><b>Purple stars ${purpleStars(s)}/${PURPLE.max}</b><span class="sub">${
      s.level < PURPLE.level
        ? `Gus’s to-do list opens at level ${PURPLE.level}.`
        : `Finish Gus’s to-do list (GOALS → To-do) for bonus stars: more customers, bigger tips.${purpleStars(s) ? ` They drop in ${fmtTime(purpleLeft(s))}.` : ''}`
    }</span></div>
    ${s.closed ? '<p class="small">You’re CLOSED: the rating slowly sags until you open again.</p>' : ''}
    <p class="small">More stars bring more customers, and rarer ones.</p>`,
    { cls: 'narrow' },
  );
}

/** Settings: what's going to happen while you're away (the check-in alerts the app would send). */
function alertsHtml(hud: Hud): string {
  const list = upcomingAlerts(hud.ctl.state).slice(0, 4);
  if (!list.length) return '<p class="small">Check-in alerts: nothing coming up.</p>';
  return `<h4>Coming up</h4><div class="list alerts">${list.map((a) => `<div class="alert-row"><b>${esc(a.title)}</b><span class="sub">in ${fmtTime(a.in)} · ${esc(a.body)}</span></div>`).join('')}</div>`;
}

/** Tap the joint's name on the awning: give it a new one. */
export function openRename(hud: Hud) {
  const cur = jointName(hud.ctl.state);
  const m = hud.openModal(
    `<h2>Name your joint</h2><input class="name-in" data-k="name" maxlength="${NAME_MAX}" value="${esc(cur === 'YOUR JOINT' ? '' : cur)}" placeholder="YOUR JOINT" aria-label="Joint name"/><div class="actions"><button class="btn green" data-a="ok">Paint it on</button></div>`,
    { cls: 'narrow' },
  );
  const inp = m.querySelector<HTMLInputElement>('[data-k="name"]')!;
  setTimeout(() => inp.focus(), 50);
  const go = () => {
    const err = renameJoint(hud.ctl.state, inp.value);
    if (err) return hud.ctl.toast(err);
    sfx('purchase');
    hud.closeModal();
  };
  inp.onkeydown = (e) => {
    if (e.key === 'Enter') go();
  };
  bindActions(m, go);
}

/** The chef picker: 9 avatars, four stats each, change any time (TRANSFORM or Settings → Chef). */
export function openChefPicker(hud: Hud) {
  const render = () => {
    const s = hud.ctl.state;
    const cur = chefOf(s).id;
    const bar = (label: string, v: number, max: number) => `<span class="cstat"><i>${label}</i><span class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></span><b>${v}</b></span>`;
    const cards = CHEFS.map((c) => {
      const st = chefStats(c.id);
      return `<button class="chef-card ${c.id === cur ? 'on' : ''}" data-a="pick" data-id="${c.id}"><img src="${headUrl(c.id)}" alt=""/><b>${esc(c.name)}</b>
        ${bar('TIPS', st.tips, 10)}${bar('ATK SPD', st.speed, 10)}${bar('ATK STR', st.power, 10)}${bar('ENERGY', st.energy, 120)}<small>${esc(c.blurb)}</small></button>`;
    }).join('');
    const m = hud.openModal(`<h2>Pick your chef</h2><div class="chefs">${cards}</div><p class="small">Tip Rating, Attack Speed, Attack Strength and Energy come with the look. Change any time, free.</p>`, { cls: 'wide chefs-modal' });
    bindActions(m, (a, el) => {
      if (a !== 'pick') return;
      const err = setChef(s, el.dataset.id!);
      if (err) return hud.ctl.toast(err);
      sfx('purchase');
      hud.ctl.info(`Looking sharp, ${chefOf(s).name}.`);
      hud.ctl.emitSel();
      render();
    });
  };
  render();
}

/** The food critic's write-up, when a purple star lands. */
export function openCritic(hud: Hud) {
  const r = criticReview(hud.ctl.state);
  hud.openModal(
    `<div class="paper"><div class="masthead">${esc(r.paper)}</div><h2>${esc(r.headline)}</h2><div class="byline">by ${esc(r.critic)}</div><p>${esc(r.body)}</p><p class="verdict">${esc(r.verdict)}</p><div class="purple-row">${purpleStarsHtml(r.stars)}</div></div><div class="actions"><button class="btn green" data-close>Frame it</button></div>`,
    { cls: 'narrow critic' },
  );
}

/** The Meat Locker: zombies on hooks, off the crew. */
export function openLocker(hud: Hud) {
  const render = () => {
    const s = hud.ctl.state;
    const l = lockerOf(s);
    const full = zombies(s).length >= s.crewCap;
    const rows = l.zombies.length
      ? l.zombies
          .map(
            (w, i) =>
              `<div class="crew-row"><img src="${headUrl(charIdFor(w))}" alt=""/><b>${esc(w.name)}<br/><span class="sub">Level ${zombieLevel(w.xp)} · PWR ${w.stats.power} · TIPS ${w.stats.tips}</span></b><button class="btn green" data-a="take" data-i="${i}" ${full ? 'disabled' : ''}>Take down</button></div>`,
          )
          .join('')
      : '<p>Nobody’s hanging around. Tap a zombie, then MEAT LOCKER, to hang them up and free a crew slot.</p>';
    const more = l.hooks < LOCKER.maxHooks ? `<button class="btn sauce" data-a="hooks">+${LOCKER.addHooks} hooks · ${priceHtml({ sauce: LOCKER.addSauce })}</button>` : '';
    const m = hud.openModal(
      `<h2>Meat Locker <span class="sub">${l.zombies.length}/${l.hooks} hooks</span></h2><div class="list">${rows}</div><div class="actions">${more}</div><p class="small">${full ? `The crew is full (${s.crewCap}/${s.crewCap}): hang someone up before taking another down.` : 'Hung zombies keep their level and energy and don’t count toward the crew.'}</p>`,
    );
    bindActions(m, (a, el) => {
      const err = a === 'take' ? takeFromLocker(s, Number(el.dataset.i)) : a === 'hooks' ? buyHooks(s) : null;
      if (err) return hud.ctl.toast(err);
      sfx(a === 'take' ? 'groan' : 'purchase');
      render();
    });
  };
  render();
}

/** The save wouldn't load: pick a backup or start fresh (the broken save is kept aside either way). */
export function openBackups(hud: Hud) {
  const p = hud.ctl.loadProblem;
  if (!p) return;
  const when = (t: number) => new Date(t).toLocaleString();
  const rows = p.backups.length
    ? p.backups.map((b) => `<div class="crew-row backup"><b>Backup from ${esc(when(b.savedAt))}<br/><span class="sub">Level ${b.level} · $${b.cash.toLocaleString('en-US')} · crew ${b.crew}</span></b><button class="btn green" data-a="load" data-slot="${b.slot}">Load</button></div>`).join('')
    : '<p>No backups were found on this device.</p>';
  const m = hud.openModal(
    `<h2>Your save won’t load</h2><p>Something scrambled it. It’s been kept aside, untouched. Load a backup, or start a new joint.</p><div class="list">${rows}</div><div class="actions"><button class="btn red" data-a="fresh">Start fresh</button></div>`,
    { cls: 'narrow', noClose: true },
  );
  bindActions(m, (a, el) => {
    if (a === 'load') {
      const err = hud.ctl.loadBackup(Number(el.dataset.slot));
      if (err) return hud.ctl.toast(err);
      sfx('levelUp');
      hud.closeModal();
      hud.ctl.info('Backup loaded. Welcome back!');
    }
    if (a === 'fresh') {
      if (!el.dataset.armed) {
        el.dataset.armed = '1';
        el.textContent = 'Tap again: new joint';
        return;
      }
      hud.ctl.startFresh();
      hud.closeModal();
    }
  });
}
