import { FLOOR_FINISHES, ITEMS, ITEM_BY_ID, WALL_FINISHES, buyCheck, dirsFor, expand, nextExpansion, ownedCount, sellFromStorage, type FinishDef, type ItemDef, type StoreTab } from '../sim';
import { sfx } from '../game/sfx';
import { artUrl, artUrlFit } from '../scenes/assets';
import { furnArt } from '../scenes/JointScene';
import type { Hud } from './hud';
import { bindActions, esc, icon, priceHtml } from './dom';

type Tab = StoreTab | 'storage';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'featured', label: 'Featured', icon: 'ui_tab_featured' },
  { id: 'decor', label: 'Decor', icon: 'ui_tab_decor' },
  { id: 'kitchen', label: 'Kitchen', icon: 'ui_tab_kitchen' },
  { id: 'furniture', label: 'Furniture', icon: 'ui_tab_furniture' },
  { id: 'walls', label: 'Walls & Floors', icon: 'ui_tab_walls' },
  { id: 'special', label: 'Special', icon: 'ui_tab_special' },
  { id: 'storage', label: 'Storage', icon: 'ui_tab_storage' },
];

let lastTab: Tab = 'featured';

export function itemArt(def: ItemDef): string {
  if (def.kind === 'wall') return `${def.art}_r`;
  return furnArt(def.id, dirsFor(def)[0]).key;
}

/** Thumbnail URL: wall hangings are cropped out of their wall-sized canvas. */
export function itemThumb(def: ItemDef): string {
  return def.kind === 'wall' ? artUrlFit(itemArt(def)) : artUrl(itemArt(def));
}

/** Star items show their bonus like the original's "+★" tag. */
function ratingTag(r: number): string {
  if (r > 0) return ` <i class="decor">+${Math.round(r * 100)}★</i>`;
  if (r < 0) return ` <i class="decor bad">${Math.round(r * 100)}★</i>`;
  return '';
}

export function openStore(hud: Hud, tab: Tab = lastTab) {
  lastTab = tab;
  const s = hud.ctl.state;
  const card = (def: ItemDef, extra = '') => {
    const err = buyCheck(s, def.id);
    const locked = def.level > s.level;
    const owned = ownedCount(s, def.id);
    return `<button class="item ${locked ? 'locked' : err ? 'dim' : ''}" data-a="buy" data-id="${def.id}">
      <div class="item-art"><img src="${itemThumb(def)}" alt=""/></div>
      <b>${esc(def.name)}</b>
      <span class="item-meta">${locked ? `${icon('fx_lock', 'ico-s')} Lv ${def.level}` : priceHtml(def)}${ratingTag(def.rating)}</span>
      ${owned ? `<span class="owned">×${owned}</span>` : ''}${extra}</button>`;
  };
  const shopItems = ITEMS.filter((i) => !i.starter);
  let body = '';
  if (tab === 'featured') {
    const fresh = shopItems.filter((i) => i.level <= s.level && i.level >= s.level - 2).slice(0, 6);
    const stars = shopItems.filter((i) => !buyCheck(s, i.id) && i.rating > 0)
      .sort((a, b) => b.rating / (b.cash ?? 99) - a.rating / (a.cash ?? 99))
      .slice(0, 4);
    const pick = [...new Map([...fresh, ...stars].map((i) => [i.id, i])).values()];
    body = expansionCard(hud) + pick.map((d) => card(d)).join('');
  } else if (tab === 'storage') {
    const ids = Object.keys(s.storage).filter((id) => s.storage[id] > 0);
    body = ids.length
      ? ids
          .map((id) => {
            const def = ITEM_BY_ID[id];
            return `<div class="item"><div class="item-art"><img src="${itemThumb(def)}" alt=""/></div><b>${esc(def.name)}</b><span class="item-meta">×${s.storage[id]} stored</span>
              <span class="item-btns"><button class="btn green tiny" data-a="place" data-id="${id}">Place</button><button class="btn red tiny" data-a="sellst" data-id="${id}">Sell</button></span></div>`;
          })
          .join('')
      : '<p class="empty">Nothing in storage. In Decorate mode, tap a piece and choose Store.</p>';
  } else {
    const items = shopItems.filter((i) => i.tab === tab).sort((a, b) => a.level - b.level);
    if (tab === 'walls') body = finishCards(hud, 'wall') + finishCards(hud, 'floor') + `<h4 class="grid-head">On the walls</h4>`;
    body += items.map((d) => card(d)).join('');
    if (tab === 'special') body = expansionCard(hud) + body;
  }
  const m = hud.openModal(
    `<h2>${icon('ui_shop', 'h-ico')} Shop</h2>
    <div class="tabs">${TABS.map((t) => `<button class="tab ${t.id === tab ? 'on' : ''}" data-a="tab" data-id="${t.id}">${icon(t.icon, 'tab-ico')}<span>${t.label}</span></button>`).join('')}</div>
    <div class="grid">${body}</div>`,
    { cls: 'store' },
  );
  bindActions(m, (a, el) => {
    const id = el.dataset.id!;
    if (a === 'tab') {
      sfx('tap');
      openStore(hud, id as Tab);
    } else if (a === 'buy') {
      const err = buyCheck(s, id);
      if (err) return hud.ctl.toast(err);
      hud.closeModal();
      hud.ctl.beginPlace(id, 'buy');
      hud.ctl.info(ITEM_BY_ID[id].kind === 'wall' ? 'Tap a spot on a wall, then ✓' : 'Drag it where you want it, then ✓');
    } else if (a === 'place') {
      hud.closeModal();
      hud.ctl.beginPlace(id, 'storage');
    } else if (a === 'sellst') {
      const err = sellFromStorage(s, id);
      if (err) hud.ctl.toast(err);
      else sfx('sell');
      openStore(hud, 'storage');
    } else if (a === 'expand') {
      if (!el.dataset.armed) {
        el.dataset.armed = '1';
        el.querySelector('b')!.textContent = 'Tap again to expand!';
        return;
      }
      const err = expand(s);
      if (err) return hud.ctl.toast(err);
      sfx('expand');
      hud.ctl.info(`The café is now ${s.roomW}×${s.roomH}! More room for tables.`);
      openStore(hud, tab);
    } else if (a === 'paint') {
      const [kind, finish] = id.split(':') as ['wall' | 'floor', string];
      hud.closeModal();
      hud.ctl.beginPaint(kind, finish);
      hud.ctl.info(kind === 'wall' ? 'Tap wall sections to paper them. Each one is bought separately.' : 'Tap floor tiles to lay them. Each tile is bought separately.');
    }
  });
}

function expansionCard(hud: Hud): string {
  const s = hud.ctl.state;
  const e = nextExpansion(s);
  if (!e) return '';
  const locked = e.level > s.level;
  return `<button class="item wide-item ${locked ? 'locked' : ''}" data-a="expand"><div class="item-art">${icon('ui_expand', 'big-ico')}</div>
    <b>Expand to ${e.w}×${e.h}</b><span class="item-meta">${locked ? `${icon('fx_lock', 'ico-s')} Lv ${e.level}` : priceHtml(e)}</span></button>`;
}

/** Wallpaper and floor tiles: pick one, then tap segments/tiles in the café to buy them one by one. */
function finishCards(hud: Hud, kind: 'wall' | 'floor'): string {
  const s = hud.ctl.state;
  const list: FinishDef[] = (kind === 'wall' ? WALL_FINISHES : FLOOR_FINISHES).filter((f) => f.cash > 0);
  return (
    `<h4 class="grid-head">${kind === 'wall' ? 'Wallpaper (per wall section)' : 'Flooring (per tile)'}</h4>` +
    list
      .map((f) => {
        const locked = f.level > s.level;
        const art = kind === 'wall' ? artUrlFit(`wall_r_${f.art}`) : artUrl(`floor_${f.art}_a`);
        return `<button class="item ${locked ? 'locked' : ''}" data-a="paint" data-id="${kind}:${f.id}">
        <div class="item-art ${kind === 'floor' ? 'floor-art' : ''}"><img src="${art}" alt=""/></div>
        <b>${esc(f.name)}</b><span class="item-meta">${locked ? `${icon('fx_lock', 'ico-s')} Lv ${f.level}` : `${priceHtml({ cash: f.cash })} each`}${ratingTag(f.rating)}</span></button>`;
      })
      .join('')
  );
}
