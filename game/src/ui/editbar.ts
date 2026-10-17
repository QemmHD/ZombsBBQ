/** Decorate-mode toolbar: place / move / rotate / store / sell, plus shortcuts to the Shop. */
import { ITEM_BY_ID, dirsFor, paintAll, rotateFurniture, sellFurniture, sellValue, sellWall, storeFurniture, storeWall } from '../sim';
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
    const paint = ctl.painting;
    const key = `${p ? `p${p.itemId}${p.source}${p.dir}` : ''}${sel ? `s${sel.kind}${sel.id}` : ''}${paint ? `b${paint.kind}${paint.finish}${ctl.state.cash}` : ''}`;
    if (key === this.lastKey && this.el.innerHTML) return this.refresh();
    this.lastKey = key;
    const s = ctl.state;
    let html = '';
    if (paint) {
      html = `<div class="eb-info"><b>${esc(ctl.paintName())}</b><span>Tap ${paint.kind === 'wall' ? 'wall sections' : 'floor tiles'} to buy them one at a time.</span></div>
        <button class="eb-btn" data-a="paintall">${icon('ui_expand', 'eb-ico')}<label>Do them all</label></button>
        <button class="eb-btn ok" data-a="paintdone">${icon('ui_check', 'eb-ico')}<label>Done</label></button>`;
    } else if (p) {
      // the original's purchase panel: flavour, "drag it", TOTAL COST and the XP it gives, PURCHASE
      const def = ITEM_BY_ID[p.itemId];
      const rot = dirsFor(def).length > 1;
      const buying = p.source === 'buy';
      const cost = buying ? `<div class="eb-cost"><span>TOTAL COST: ${priceHtml(def)}</span>${def.xp ? `<span class="xp">+${def.xp} XP</span>` : ''}</div>` : '';
      html = `<div class="eb-info"><b>${esc(def.name)}</b><span>${esc(def.blurb)}</span><span>${p.wall ? 'Tap a spot on a wall.' : `Drag the ${buying ? 'new ' : ''}item to place it.`}</span><span class="problem" data-k="problem"></span></div>
        ${cost}
        ${rot ? `<button class="eb-btn rot" data-a="rot">${icon('ui_rotate', 'eb-ico')}<label>Rotate</label></button>` : ''}
        <button class="eb-btn ok purchase" data-a="ok">${icon('ui_check', 'eb-ico')}<label>${buying ? 'PURCHASE' : 'PLACE'}</label></button>
        <button class="eb-btn" data-a="cancel">${icon('ui_cancel', 'eb-ico')}<label>Cancel</label></button>`;
    } else if (sel) {
      const item = sel.kind === 'furn' ? s.furniture.find((f) => f.id === sel.id)?.item : s.wallItems.find((w) => w.id === sel.id)?.item;
      const def = item ? ITEM_BY_ID[item] : undefined;
      if (!def) return ctl.selectEdit(null);
      const rot = sel.kind === 'furn' && dirsFor(def).length > 1;
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
      case 'paintall': {
        const pt = ctl.painting;
        if (!pt) return;
        const { done, err } = paintAll(s, pt.kind === 'wall' ? 'walls' : 'floors', pt.finish);
        if (done) {
          sfx('purchase');
          ctl.info(`Did ${done} ${pt.kind === 'wall' ? 'wall sections' : 'tiles'}.`);
        } else if (err) ctl.toast(err);
        return ctl.emitSel();
      }
      case 'paintdone':
        sfx('close');
        return ctl.endPaint();
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
