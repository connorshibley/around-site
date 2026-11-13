// Runs on every page: the cart (kept in this browser only), the cart count in
// the bar, "Add to cart" buttons, and the motion switch in the footer.
import { addItem, setQty, parseCart, totals, cartLines, formatMoney } from '../lib/cart.js';
import { buildCatalog } from '../data/drinks.js';

const html = document.documentElement;
const KEY = 'around-cart';
export const catalog = buildCatalog();

// ---- cart store ---------------------------------------------------------------
// localStorage can be missing or blocked (private windows), so every access is
// guarded and the cart falls back to living in memory for this page view.
let memory = {};
export function readCart() {
  try {
    memory = parseCart(localStorage.getItem(KEY));
  } catch (e) {}
  return memory;
}
function writeCart(cart) {
  memory = cart;
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch (e) {}
  paintCount();
  document.dispatchEvent(new CustomEvent('around:cart', { detail: cart }));
}
export const cart = {
  get: readCart,
  add: (sku, qty = 1) => writeCart(addItem(readCart(), sku, qty)),
  set: (sku, qty) => writeCart(setQty(readCart(), sku, qty)),
  clear: () => writeCart({}),
  lines: () => cartLines(readCart(), catalog),
  totals: () => totals(readCart(), catalog),
};
export { formatMoney };

// ---- cart count in the bar ------------------------------------------------------
function paintCount() {
  const n = totals(memory, catalog).packs;
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(n);
  });
  document.querySelectorAll('[data-cart-link]').forEach((el) => {
    el.setAttribute('aria-label', n === 1 ? 'Cart, 1 pack' : `Cart, ${n} packs`);
    el.classList.toggle('has-items', n > 0);
  });
}

// ---- add to cart ---------------------------------------------------------------
// A button either names its pack directly (data-add="starter") or sits in a
// form whose checked radio names it (data-add-from-form).
const live = document.querySelector('[data-live]');
function announce(text) {
  if (live) live.textContent = text;
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add], [data-add-from-form]');
  if (!btn) return;
  e.preventDefault();
  let sku = btn.getAttribute('data-add');
  if (!sku) {
    const form = btn.closest('form');
    const picked = form && form.querySelector('input[type="radio"]:checked');
    sku = picked ? picked.value : null;
  }
  if (!sku || !catalog[sku]) return;
  cart.add(sku);
  const item = catalog[sku];
  announce(`Added to cart: ${item.name}, ${item.detail}.`);
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = 'Added';
  btn.classList.add('is-added');
  clearTimeout(btn._t);
  btn._t = setTimeout(() => {
    btn.textContent = btn.dataset.label;
    btn.classList.remove('is-added');
  }, 1600);
});

// ---- motion switch ------------------------------------------------------------
const toggle = document.querySelector('[data-motion-toggle]');
function paintToggle() {
  if (!toggle) return;
  const off = html.dataset.motion === 'off';
  toggle.setAttribute('aria-pressed', off ? 'true' : 'false');
  toggle.textContent = off ? 'Motion: off' : 'Motion: on';
}
if (toggle) {
  paintToggle();
  toggle.addEventListener('click', () => {
    const off = html.dataset.motion !== 'off';
    if (off) html.dataset.motion = 'off';
    else delete html.dataset.motion;
    try {
      localStorage.setItem('around-motion', off ? 'off' : 'on');
    } catch (e) {}
    paintToggle();
  });
}

// ---- phone menu ---------------------------------------------------------------
const menu = document.querySelector('[data-menu]');
if (menu) {
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
}

readCart();
paintCount();
// Another tab changed the cart: keep this one in step.
addEventListener('storage', (e) => {
  if (e.key === KEY) {
    readCart();
    paintCount();
    document.dispatchEvent(new CustomEvent('around:cart', { detail: memory }));
  }
});
