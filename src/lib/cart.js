// Cart logic. Pure functions: a cart is a plain object of { sku: quantity },
// and nothing here touches the page or storage (see src/scripts/site.js).
const MAX_PER_LINE = 24;

const validQty = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_PER_LINE;

export function setQty(cart, sku, qty) {
  const next = { ...cart };
  const n = Math.min(Math.floor(qty), MAX_PER_LINE);
  if (n >= 1) next[sku] = n;
  else delete next[sku];
  return next;
}

export function addItem(cart, sku, qty = 1) {
  return setQty(cart, sku, (cart[sku] || 0) + qty);
}

export function cartLines(cart, catalog) {
  return Object.keys(cart)
    .filter((sku) => catalog[sku])
    .map((sku) => {
      const item = catalog[sku];
      const qty = cart[sku];
      return { sku, name: item.name, detail: item.detail, qty, cents: item.cents, lineCents: item.cents * qty };
    });
}

export function totals(cart, catalog) {
  return Object.keys(cart)
    .filter((sku) => catalog[sku])
    .reduce(
      (sum, sku) => ({
        packs: sum.packs + cart[sku],
        cans: sum.cans + catalog[sku].cans * cart[sku],
        subtotalCents: sum.subtotalCents + catalog[sku].cents * cart[sku],
      }),
      { packs: 0, cans: 0, subtotalCents: 0 }
    );
}

// Whatever is in the browser's storage is untrusted: keep only well-formed lines.
export function parseCart(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return {};
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const cart = {};
  for (const sku of Object.keys(data)) {
    if (validQty(data[sku])) cart[sku] = data[sku];
  }
  return cart;
}

export function formatMoney(cents) {
  return '$' + (cents / 100).toFixed(2);
}
