import { MAP_LAYOUT } from "../art";
import {
  DISH_BY_ID,
  ITEM_BY_ID,
  RAID_TIME,
  RIVAL_BY_ID,
  ROAD,
  SUMMON_COST,
  TOMBSTONE_USES,
  bossHere,
  buySummon,
  maxEnergy,
  order,
  raidCandidates,
  retreat,
  rivalClosed,
  rivalGen,
  rivalName,
  rivalReady,
  rivalUnlocked,
  sendAll,
  stealingRivals,
  useSummon,
  useTombstone,
  type RivalId,
} from "../sim";
import { music, sfx } from "../game/sfx";
import { artUrl, headUrl } from "../scenes/assets";
import { charIdFor } from "../scenes/JointScene";
import type { Hud } from "./hud";
import {
  bindActions,
  energyColor,
  esc,
  icon,
  priceHtml,
  starsHtml,
} from "./dom";

// ---------- the road-trip map ----------

/** Where each pin stands on the map (1600×900). */
const PIN: Record<string, { x: number; y: number }> = {
  ...MAP_LAYOUT,
  boss: { x: 1380, y: 770 },
};

export function openMap(hud: Hud) {
  const s = hud.ctl.state;
  music("map");
  const thieves = new Set(stealingRivals(s));
  const list = [...ROAD, ...(bossHere(s) ? [RIVAL_BY_ID.boss] : [])];
  const pins = list
    .map((r) => {
      const pos = PIN[r.id];
      const unlocked = rivalUnlocked(s, r.id);
      const closed = rivalClosed(s, r.id);
      const prog = s.rivals[r.id];
      const gen = rivalGen(s, r.id);
      const lvl = Math.round(r.level + gen * 1.5);
      return `<button class="map-pin ${unlocked ? "" : "locked"} ${r.id === "boss" ? "boss" : ""}" style="left:${(pos.x / 1600) * 100}%;top:${(pos.y / 900) * 100}%" data-a="rival" data-id="${r.id}">
      <img src="${artUrl(`map_joint_${r.id}`) || artUrl("map_joint_chuck")}" alt=""/>${closed ? `<img class="pin-over" src="${artUrl("map_closed")}" alt=""/>` : ""}${thieves.has(r.id) ? `<img class="pin-steal" src="${artUrl("map_steal")}" alt=""/>` : ""}
      <span class="pin-label">${unlocked ? "" : icon("fx_lock", "ico-s")}${r.id === "boss" ? "BOSS " : ""}LV ${lvl}${prog?.wins ? ` ${starsHtml(prog.stars)}` : ""}</span></button>`;
    })
    .join("");
  const home = PIN.home;
  const m = hud.openModal(
    `<div class="map-wrap"><img class="map-bg" src="${artUrl("map_bg")}" alt="Road trip map"/>
      <div class="map-pin home" style="left:${(home.x / 1600) * 100}%;top:${(home.y / 900) * 100}%"><img src="${artUrl("map_home")}" alt=""/><span class="pin-label">YOUR JOINT</span></div>
      ${pins}</div>
      ${thieves.size ? `<p class="small warn">${[...thieves].map((id) => esc(rivalName(s, id))).join(", ")} ${thieves.size > 1 ? "are" : "is"} stealing your customers! Raid them to put a stop to it.</p>` : ""}`,
    { cls: "map", onClose: () => hud.ctl.mode === "play" && music("joint") },
  );
  bindActions(m, (a, el) => {
    if (a === "rival") {
      sfx("tap");
      openRivalCard(hud, el.dataset.id as RivalId);
    }
  });
}

function openRivalCard(hud: Hud, id: RivalId) {
  const s = hud.ctl.state;
  const r = RIVAL_BY_ID[id];
  const prog = s.rivals[id];
  const err = rivalReady(s, id);
  const gen = rivalGen(s, id);
  const mult = 1 + gen * 0.2;
  const sig = DISH_BY_ID[r.signature];
  const loot =
    id === "boss"
      ? `${priceHtml({ cash: r.reward.cash })} <span>+${r.reward.xp} XP</span> ${icon("ui_sauce", "ico-s")}<span>3–5 sauce</span> <span>+ a secret recipe</span>`
      : `${priceHtml({ cash: Math.round(r.reward.cash * mult) })} <span>+${Math.round(r.reward.xp * mult)} XP</span> <img class="ico" src="${artUrl(sig.icon)}" alt=""/> <span>${esc(sig.name)} recipe${s.recipes.includes(sig.id) ? " (known)" : ""}</span> <span>${icon("ui_sauce", "ico-s")} maybe</span>`;
  const m = hud.openModal(
    `<div class="rival-head"><img src="${headUrl(`boss_${id}`)}" alt=""/><div><h2>${esc(rivalName(s, id))}</h2><div class="sub">Head Chef: ${esc(r.chef)} · Level ${Math.round(r.level + gen * 1.5)}${gen ? " · new management" : ""}</div>${prog?.wins ? `<div class="stars">${starsHtml(prog.stars)}</div>` : ""}</div></div>
    <p class="quote">“${esc(r.taunt)}”</p>
    <div class="chips"><span class="chip">${r.tables} diners</span><span class="chip">${r.staff.count} waiters</span><span class="chip">Chef ${Math.round(r.boss.hp * mult)} HP</span></div>
    <div class="loot-row"><span>Win:</span> ${loot}</div>
    <div class="actions"><button class="btn" data-a="back">${icon("ui_raid", "ico-s")} Map</button><button class="btn red big-btn" data-a="go" ${err ? "disabled" : ""}>RAID!</button></div>
    ${err ? `<p class="small warn">${esc(err)}</p>` : '<p class="small">Pick your squad next. Energy is health in a fight! Diners you catch pay out even if you lose.</p>'}`,
    { cls: "narrow", onClose: () => hud.ctl.mode === "play" && music("joint") },
  );
  bindActions(m, (a) => {
    if (a === "back") openMap(hud);
    if (a === "go") openSquad(hud, id);
  });
}

function openSquad(
  hud: Hud,
  id: RivalId,
  picked?: Set<string>,
  pets?: Set<string>,
) {
  const s = hud.ctl.state;
  const cands = raidCandidates(s).filter(
    (w) => w.kind === "zombie" || w.kind === "you",
  );
  picked ??= new Set(
    cands
      .filter((w) => w.kind === "zombie" && w.energy > maxEnergy(w) * 0.5)
      .map((w) => w.id),
  );
  pets ??= new Set(s.pets.map((p) => p.id));
  const tiles = cands
    .map((w) => {
      const f = w.energy / maxEnergy(w);
      return `<button class="squad-tile ${picked!.has(w.id) ? "on" : ""}" data-a="toggle" data-id="${w.id}"><img src="${headUrl(charIdFor(w))}" alt=""/><b>${esc(w.name)}</b><span class="bar"><i style="width:${f * 100}%;background:${energyColor(f)}"></i></span><span class="sub">PWR ${w.stats.power} · ${Math.floor(w.energy)} HP</span></button>`;
    })
    .join("");
  const petTiles = s.pets
    .map(
      (p) =>
        `<button class="squad-tile ${pets!.has(p.id) ? "on" : ""}" data-a="pet" data-id="${p.id}"><img src="${headUrl(p.type === "pug" ? "pet_pug" : "pet_rotweiler")}" alt=""/><b>${p.type === "pug" ? "Zombie Pug" : "Rot-weiler"}</b><span class="sub">Pet</span></button>`,
    )
    .join("");
  const m = hud.openModal(
    `<h2>Pick your squad · ${esc(RIVAL_BY_ID[id].name)}</h2>
    <div class="squad">${tiles || "<p>No one’s free! Zombies who are cooking or knocked out can’t come.</p>"}${petTiles}</div>
    <div class="kit"><span>${
      tombstones(s).length
        ? `Tombstones: ${tombstones(s)
            .map(
              (f) =>
                `${icon(ITEM_BY_ID[f.item].art, "ico")}×${f.uses ?? TOMBSTONE_USES}`,
            )
            .join(" ")}`
        : "No tombstones yet: buy them in the Shop (Special) and set them on your lawn."
    }</span>
      <button class="btn tiny" data-a="buysm" ${s.level < 5 ? "disabled" : ""}>${icon("fx_summon", "ico-s")} Summon ×${s.inventory.summon} · +1 ${priceHtml({ sauce: SUMMON_COST })}</button></div>
    <div class="actions"><button class="btn" data-a="back">Back</button><button class="btn red big-btn" data-a="start" ${picked.size ? "" : "disabled"}>SEND ${picked.size} TO THE FIGHT</button></div>`,
    { cls: "wide", onClose: () => hud.ctl.mode === "play" && music("joint") },
  );
  bindActions(m, (a, el) => {
    const wid = el.dataset.id!;
    if (a === "toggle") {
      if (picked!.has(wid)) picked!.delete(wid);
      else picked!.add(wid);
      sfx("tap");
      return openSquad(hud, id, picked, pets);
    }
    if (a === "pet") {
      if (pets!.has(wid)) pets!.delete(wid);
      else pets!.add(wid);
      return openSquad(hud, id, picked, pets);
    }
    if (a === "buysm") {
      const err = buySummon(s);
      if (err) hud.ctl.toast(err);
      else sfx("purchase");
      return openSquad(hud, id, picked, pets);
    }
    if (a === "back") return openRivalCard(hud, id);
    if (a === "start") {
      const err = hud.ctl.beginRaid(id, [...picked!], [...pets!]);
      if (err) return hud.ctl.toast(err);
      sfx("flag");
      music("raid");
    }
  });
}

/** Your placed raid tombstones (the lawn ones). */
function tombstones(s: Hud["ctl"]["state"]) {
  return s.furniture.filter((f) => ITEM_BY_ID[f.item]?.kind === "tombstone");
}

// ---------- in-raid HUD ----------

export class RaidUi {
  private built = "";
  private endAt = 0;
  constructor(
    private hud: Hud,
    private el: HTMLElement,
  ) {
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  refresh() {
    const ctl = this.hud.ctl;
    const r = ctl.raid;
    if (!r) {
      this.el.innerHTML = "";
      this.built = "";
      return;
    }
    const s = ctl.state;
    const def = RIVAL_BY_ID[r.rival];
    const stones = tombstones(s);
    const sig = `${r.rival}${r.units.length}${stones.map((f) => f.id).join()}`;
    if (this.built !== sig) {
      this.built = sig;
      this.el.innerHTML = `
        <div class="rh-top"><button class="flag-btn" data-a="flag" aria-label="Retreat">${icon("fx_flag", "rh-ico")}</button>
          <div class="rh-name"><b>${esc(r.name)}</b><span class="sub">Beat ${esc(def.chef)}!</span></div>
          <div class="rh-timer" data-k="timer"></div></div>
        <div class="rh-tray" data-k="tray"></div>
        <div class="rh-orders"><span class="rh-hint" data-k="hint"></span><button class="btn red" data-a="attack" data-k="attack">ATTACK</button><button class="btn red" data-a="sendall" data-k="sendall">ATTACK ALL</button></div>
        <div class="rh-loot" data-k="loot"></div>
        <div class="rh-items">
          ${stones.map((f) => `<button class="item-btn stone" data-a="stone" data-id="${f.id}">${icon(ITEM_BY_ID[f.item].art, "rh-ico")}<span data-k="st${f.id}"></span></button>`).join("")}
          <button class="item-btn" data-a="sm">${icon("fx_summon", "rh-ico")}<span data-k="sc"></span></button>
        </div>`;
      bindActions(this.el, (a, el) => this.action(a, el));
    }
    const q = (k: string) =>
      this.el.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    const left = Math.max(0, RAID_TIME - r.t);
    q("timer").textContent =
      `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
    q("timer").classList.toggle("urgent", left < 20);
    const squad = r.units.filter((u) => u.side === "z");
    const sel = ctl.raidSel;
    const tray = squad
      .map((u) => {
        const f = Math.max(0, u.hp / u.maxHp);
        return `<button class="tray-u ${u.state === "queued" ? "queued" : u.hp <= 0 ? "ko" : ""} ${sel === u.id ? "on" : ""}" data-u="${u.id}"><img src="${headUrl(u.art, u.hp <= 0 ? "dazed" : undefined)}" alt=""/><i style="width:${f * 100}%"></i></button>`;
      })
      .join("");
    if (q("tray").dataset.v !== tray) {
      q("tray").dataset.v = tray;
      q("tray").innerHTML = tray;
      q("tray")
        .querySelectorAll<HTMLElement>("[data-u]")
        .forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            const id = b.dataset.u!;
            const u = r.units.find((x) => x.id === id);
            if (!u || u.hp <= 0) return;
            sfx("groan", { pitch: 0.8 + Math.random() * 0.4 });
            ctl.selectRaider(ctl.raidSel === id ? null : id);
          };
        });
    }
    const fighting = r.phase === "fight";
    const queued = squad.some((u) => u.state === "queued");
    q("sendall").style.display = queued && fighting ? "" : "none";
    q("attack").style.display = sel && fighting ? "" : "none";
    q("hint").textContent = !fighting
      ? ""
      : sel
        ? "Now tap a target, the counter, or ATTACK."
        : queued
          ? "Tap a zombie in line, then a target. Or ATTACK ALL."
          : "";
    q("loot").innerHTML =
      `${priceHtml({ cash: r.cashEaten })}${r.stolen.map((d) => `<img class="ico" src="${artUrl(DISH_BY_ID[d].icon)}" alt=""/>`).join("")}`;
    for (const f of stones) {
      const n = this.el.querySelector<HTMLElement>(`[data-k="st${f.id}"]`);
      if (n)
        n.textContent =
          (f.usesResetAt ?? 0) > s.now ? "0" : String(f.uses ?? TOMBSTONE_USES);
      n?.parentElement?.classList.toggle(
        "glow",
        !!r.buff &&
          r.t < r.buff.until &&
          ITEM_BY_ID[f.item].boost === r.buff.kind,
      );
    }
    q("sc").textContent = String(s.inventory.summon);
    if (fighting) this.endAt = 0;
    else if (!ctl.raidResult) {
      // let the final KO / retreat play out for a beat before the results card
      if (!this.endAt) this.endAt = performance.now();
      else if (performance.now() - this.endAt > 1400) this.showResult();
    }
  }

  private action(a: string, el: HTMLElement) {
    const ctl = this.hud.ctl;
    const r = ctl.raid;
    if (!r || r.phase !== "fight") return;
    const s = ctl.state;
    let err: string | null = null;
    if (a === "flag") {
      retreat(r);
      return;
    }
    if (a === "sendall") {
      err = sendAll(r);
      if (!err) sfx("groan", { pitch: 0.7 });
      ctl.selectRaider(null);
    }
    if (a === "attack" && ctl.raidSel) {
      err = order(r, ctl.raidSel, { kind: "attack" });
      if (!err) sfx("groan", { pitch: 0.8 });
      ctl.selectRaider(null);
    }
    if (a === "stone") err = useTombstone(s, r, el.dataset.id!);
    if (a === "sm") err = useSummon(s, r);
    if (err) ctl.toast(err);
  }

  private showResult() {
    const ctl = this.hud.ctl;
    const res = ctl.endRaid();
    if (!res) return;
    this.endAt = 0;
    this.hud.clearToasts();
    const r = ctl.raid!;
    const def = RIVAL_BY_ID[r.rival];
    const title =
      res.result === "won"
        ? "VICTORY!"
        : res.result === "retreat"
          ? "RETREAT!"
          : "DEFEAT!";
    const flavor =
      res.result === "won"
        ? `${def.chef} is down for the count!`
        : res.result === "retreat"
          ? "You ran for it. Smart. Cowardly, but smart."
          : `${def.chef} sent your crew packing.`;
    const m = this.hud.openModal(
      `<div class="burst ${res.result}"><h2 class="big">${title}</h2></div><p>${esc(flavor)}</p>
      ${res.stars ? `<div class="stars big-stars">${starsHtml(res.stars)}</div>` : ""}
      <div class="unlocks">
        <div>${priceHtml({ cash: res.cash })} cash</div>
        ${res.xp ? `<div>+${res.xp} XP</div>` : ""}
        ${res.sauce ? `<div>${priceHtml({ sauce: res.sauce })} Brain Sauce from the Head Chef!</div>` : ""}
        ${res.dishes.map((d) => `<div><img class="ico" src="${artUrl(DISH_BY_ID[d].icon)}" alt=""/> ${esc(DISH_BY_ID[d].name)} → Fridge${res.recipeDrop === d ? " (study it for the recipe!)" : ""}</div>`).join("")}
        ${res.kos.length ? `<div class="warn">KO’d: ${res.kos.map(esc).join(", ")} (they reanimate in an hour, or revive them with Brain Sauce)</div>` : ""}
      </div>
      <div class="actions"><button class="btn green big-btn" data-a="home">Back to the joint</button></div>`,
      { cls: "narrow", noClose: true },
    );
    bindActions(m, () => {
      this.hud.closeModal();
      ctl.leaveRaid();
      music("joint");
    });
  }
}
