import { ITEMS, ITEM_BY_ID, THEMES, buyCheck, buyTheme, expand, nextExpansion, ownedCount, sellFromStorage, type ItemDef, type StoreTab } from '../sim';
import { sfx } from '../game/sfx';
import { artUrl } from '../scenes/assets';
import { furnKey, themeKeys } from '../scenes/JointScene';
import type { Hud } from './hud';
import { bindActions, esc, icon, priceHtml } from './dom';

type Tab = StoreTab | 'storage';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'featured', label: 'Featured', icon: 'ui_tab_featured' },
  { id: 'decor', label: 'Decor', icon: 'ui_tab_decor' },
  { id: 'kitchen', label: 'Kitchen', icon: 'ui_tab_kitchen' },
  { id: 'furniture', label: 'Furniture', icon: 'ui_tab_furniture' },
  { id: 'walls', label: 'Walls', icon: 'ui_tab_walls' },
  { id: 'special', label: 'Special', icon: 'ui_tab_special' },
  { id: 'storage', label: 'Storage', icon: 'ui_tab_storage' },
];

let lastTab: Tab = 'featured';

export function itemArt(def: ItemDef): string {
  if (def.kind === 'wall') return `${def.art}_r`;
  return furnKey(def.id, def.dirs?.[0]);
}

export function openStore(hud: Hud, tab: Tab = lastTab) {
  lastTab = tab;
  const s = hud.ctl.state;
  const card = (def: ItemDef, extra = '') => {
    const err = buyCheck(s, def.id);
    const locked = def.level > s.level;
    const owned = ownedCount(s, def.id);
    return `<button class="item ${locked ? 'locked' : err ? 'dim' : ''}" data-a="buy" data-id="${def.id}">
      <div class="item-art"><img src="${artUrl(itemArt(def))}" alt=""/></div>
      <b>${esc(def.name)}</b>
      <span class="item-meta">${locked ? `${icon('fx_lock', 'ico-s')} Lv ${def.level}` : priceHtml(def)}${def.decor ? ` <i class="decor">+${def.decor}★pts</i>` : ''}</span>
      ${owned ? `<span class="owned">×${owned}</span>` : ''}${extra}</button>`;
  };
  let body = '';
  if (tab === 'featured') {
    const fresh = ITEMS.filter((i) => i.level <= s.level && i.level >= s.level - 2).slice(0, 6);
    const cheap = ITEMS.filter((i) => !buyCheck(s, i.id) && (i.kind === 'decor' || i.kind === 'wall'))
      .sort((a, b) => b.decor / (b.cash ?? 99) - a.decor / (a.cash ?? 99))
      .slice(0, 4);
    const pick = [...new Map([...fresh, ...cheap].map((i) => [i.id, i])).values()];
    body = expansionCard(hud) + pick.map((d) => card(d)).join('');
  } else if (tab === 'storage') {
    const ids = Object.keys(s.storage);
    body = ids.length
      ? ids
          .map((id) => {
            const def = ITEM_BY_ID[id];
            return `<div class="item"><div class="item-art"><img src="${artUrl(itemArt(def))}" alt=""/></div><b>${esc(def.name)}</b><span class="item-meta">×${s.storage[id]} stored</span>
              <span class="item-btns"><button class="btn green tiny" data-a="place" data-id="${id}">Place</button><button class="btn red tiny" data-a="sellst" data-id="${id}">Sell</button></span></div>`;
          })
          .join('')
      : '<p class="empty">Nothing in storage. In Decorate mode, tap a piece and choose Store.</p>';
  } else {
    const items = ITEMS.filter((i) => i.tab === tab).sort((a, b) => a.level - b.level);
    body = items.map((d) => card(d)).join('');
    if (tab === 'walls') body += themeCards(hud);
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
      hud.ctl.info(ITEM_BY_ID[id].kind === 'wall' ? 'Tap a wall spot, then ✓' : 'Drag it where you want it, then ✓');
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
      hud.ctl.info(`The joint is now ${s.roomN}×${s.roomN}! More room for tables.`);
      openStore(hud, tab);
    } else if (a === 'theme') {
      const owned = s.ownedThemes.includes(id as never);
      const err = buyTheme(s, id as never);
      if (err) return hud.ctl.toast(err);
      sfx(owned ? 'place' : 'purchase');
      hud.ctl.info(owned ? 'Redecorated!' : 'New theme! The crew loves it.');
      openStore(hud, 'walls');
    }
  });
}

function expansionCard(hud: Hud): string {
  const s = hud.ctl.state;
  const e = nextExpansion(s);
  if (!e) return '';
  const locked = e.level > s.level;
  return `<button class="item wide-item ${locked ? 'locked' : ''}" data-a="expand"><div class="item-art">${icon('ui_expand', 'big-ico')}</div>
    <b>Expand to ${e.size}×${e.size}</b><span class="item-meta">${locked ? `${icon('fx_lock', 'ico-s')} Lv ${e.level}` : priceHtml(e)}</span></button>`;
}

function themeCards(hud: Hud): string {
  const s = hud.ctl.state;
  return (
    `<h4 class="grid-head">Themes: new floors and walls</h4>` +
    THEMES.map((t) => {
      const owned = s.ownedThemes.includes(t.id);
      const on = s.theme === t.id;
      const locked = !owned && t.level > s.level;
      const k = themeKeys(t.id);
      return `<button class="item ${locked ? 'locked' : ''} ${on ? 'on' : ''}" data-a="theme" data-id="${t.id}">
        <div class="item-art theme-art"><img src="${artUrl(k.l)}" alt=""/><img src="${artUrl(k.a)}" alt="" class="floor"/></div>
        <b>${esc(t.name)}</b><span class="item-meta">${on ? 'In use' : owned ? 'Owned · tap to use' : locked ? `${icon('fx_lock', 'ico-s')} Lv ${t.level}` : priceHtml(t)}${t.decor ? ` <i class="decor">+${t.decor}★pts</i>` : ''}</span></button>`;
    }).join('')
  );
}
