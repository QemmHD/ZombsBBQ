/** Decorate-mode toolbar: place / move / rotate / store / sell, plus shortcuts to the Shop. */
import { ITEM_BY_ID, rotateFurniture, sellFurniture, sellValue, sellWall, storeFurniture, storeWall } from '../sim';
import { sfx } from '../game/sfx';
import type { Hud } from './hud';
import { bindActions, esc, icon, priceHtml } from './dom';
import { openStore } from './store';

export class EditBar {
  private lastKey = '';
  constructor(
    private hud: Hud,
    private el: HTMLElement,
  ) {
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  refresh() {
    // the "can I put it here?" hint changes as you drag
    const p = this.hud.ctl.placing;
    const hint = this.el.querySelector<HTMLElement>('[data-k="problem"]');
    if (p && hint) {
      const err = this.hud.ctl.placementProblem();
      hint.textContent = err ?? 'Looks good!';
      hint.className = `problem ${err ? 'bad' : 'ok'}`;
      const ok = this.el.querySelector<HTMLButtonElement>('[data-a="ok"]');
      if (ok) ok.disabled = !!err;
    }
  }

  render() {
    const ctl = this.hud.ctl;
    if (ctl.mode !== 'edit') {
      this.el.innerHTML = '';
      this.lastKey = '';
      return;
    }
    const p = ctl.placing;
    const sel = ctl.editSel;
    const key = `${p ? `p${p.itemId}${p.source}${p.dir}` : ''}${sel ? `s${sel.kind}${sel.id}` : ''}`;
    if (key === this.lastKey && this.el.innerHTML) return this.refresh();
    this.lastKey = key;
    const s = ctl.state;
    let html = '';
    if (p) {
      const def = ITEM_BY_ID[p.itemId];
      const rot = def.dirs && def.dirs.length > 1;
      html = `<div class="eb-info"><b>${esc(def.name)}</b><span>${p.source === 'buy' ? priceHtml(def) : p.source === 'storage' ? 'From storage' : 'Moving'}</span><span class="problem" data-k="problem"></span></div>
        ${rot ? `<button class="eb-btn" data-a="rot">${icon('ui_rotate', 'eb-ico')}<label>Rotate</label></button>` : ''}
        <button class="eb-btn ok" data-a="ok">${icon('ui_check', 'eb-ico')}<label>${p.source === 'buy' ? 'Buy' : 'Place'}</label></button>
        <button class="eb-btn" data-a="cancel">${icon('ui_cancel', 'eb-ico')}<label>Cancel</label></button>`;
    } else if (sel) {
      const item = sel.kind === 'furn' ? s.furniture.find((f) => f.id === sel.id)?.item : s.walls.find((w) => w.id === sel.id)?.item;
      const def = item ? ITEM_BY_ID[item] : undefined;
      if (!def) return ctl.selectEdit(null);
      const rot = sel.kind === 'furn' && def.dirs && def.dirs.length > 1;
      html = `<div class="eb-info"><b>${esc(def.name)}</b><span>${esc(def.blurb)}</span></div>
        <button class="eb-btn" data-a="move">${icon('ui_move', 'eb-ico')}<label>Move</label></button>
        ${rot ? `<button class="eb-btn" data-a="rotsel">${icon('ui_rotate', 'eb-ico')}<label>Rotate</label></button>` : ''}
        <button class="eb-btn" data-a="store">${icon('ui_storage', 'eb-ico')}<label>Store</label></button>
        <button class="eb-btn" data-a="sell">${icon('ui_sell', 'eb-ico')}<label>Sell ${priceHtml(sellValue(def).sauce ? { sauce: sellValue(def).sauce } : { cash: sellValue(def).cash })}</label></button>
        <button class="eb-btn" data-a="desel">${icon('ui_cancel', 'eb-ico')}<label>Close</label></button>`;
    } else {
      html = `<div class="eb-info"><b>Decorating</b><span>Tap a piece to move, rotate, store or sell it. Drag to look around.</span></div>
        <button class="eb-btn" data-a="shop">${icon('ui_shop', 'eb-ico')}<label>Shop</label></button>
        <button class="eb-btn" data-a="storage">${icon('ui_storage', 'eb-ico')}<label>Storage</label></button>
        <button class="eb-btn ok" data-a="done">${icon('ui_check', 'eb-ico')}<label>Done</label></button>`;
    }
    this.el.innerHTML = html;
    bindActions(this.el, (a) => this.action(a));
    this.refresh();
  }

  private action(a: string) {
    const ctl = this.hud.ctl;
    const s = ctl.state;
    const sel = ctl.editSel;
    switch (a) {
      case 'rot':
        return ctl.rotatePlacement();
      case 'ok':
        return ctl.confirmPlacement();
      case 'cancel':
        sfx('close');
        return ctl.cancelPlacement();
      case 'move':
        return ctl.beginMove();
      case 'rotsel': {
        if (sel?.kind !== 'furn') return;
        const err = rotateFurniture(s, sel.id);
        if (err) ctl.toast(err);
        else sfx('rotate');
        return;
      }
      case 'store': {
        if (!sel) return;
        const err = sel.kind === 'furn' ? storeFurniture(s, sel.id) : storeWall(s, sel.id);
        if (err) return ctl.toast(err);
        sfx('place');
        return ctl.selectEdit(null);
      }
      case 'sell': {
        if (!sel) return;
        const err = sel.kind === 'furn' ? sellFurniture(s, sel.id) : sellWall(s, sel.id);
        if (err) return ctl.toast(err);
        sfx('sell');
        return ctl.selectEdit(null);
      }
      case 'desel':
        return ctl.selectEdit(null);
      case 'shop':
        sfx('open');
        return openStore(this.hud);
      case 'storage':
        sfx('open');
        return openStore(this.hud, 'storage');
      case 'done':
        sfx('close');
        return ctl.exitEdit();
    }
  }
}
