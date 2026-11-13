import { describe, it, expect } from 'vitest';
import { addItem, setQty, cartLines, totals, parseCart, formatMoney } from '../src/lib/cart.js';
import { recommend } from '../src/lib/quiz.js';

const catalog = {
  'mexico-4': { name: 'Prickly Pear Agave Paloma', detail: '4-pack', cans: 4, cents: 1400 },
  'italy-12': { name: 'Italian Summer Spritz', detail: '12-pack', cans: 12, cents: 3600 },
  starter: { name: 'World Tour starter pack', detail: 'Two of each', cans: 6, cents: 2100 },
};

describe('addItem', () => {
  it('adds a new pack with quantity 1', () => {
    expect(addItem({}, 'mexico-4')).toEqual({ 'mexico-4': 1 });
  });
  it('increases the quantity of a pack already in the cart', () => {
    expect(addItem({ 'mexico-4': 1 }, 'mexico-4', 2)).toEqual({ 'mexico-4': 3 });
  });
  it('does not change the cart it was given', () => {
    const before = { 'mexico-4': 1 };
    addItem(before, 'mexico-4');
    expect(before).toEqual({ 'mexico-4': 1 });
  });
  it('never lets one line go above 24 packs', () => {
    expect(addItem({ 'mexico-4': 23 }, 'mexico-4', 5)).toEqual({ 'mexico-4': 24 });
  });
});

describe('setQty', () => {
  it('sets an exact quantity', () => {
    expect(setQty({ 'mexico-4': 1 }, 'mexico-4', 4)).toEqual({ 'mexico-4': 4 });
  });
  it('removes the line when the quantity drops to zero', () => {
    expect(setQty({ 'mexico-4': 1, starter: 1 }, 'mexico-4', 0)).toEqual({ starter: 1 });
  });
});

describe('cartLines', () => {
  it('describes each line with its name, quantity and line total', () => {
    expect(cartLines({ 'mexico-4': 2 }, catalog)).toEqual([
      { sku: 'mexico-4', name: 'Prickly Pear Agave Paloma', detail: '4-pack', qty: 2, cents: 1400, lineCents: 2800 },
    ]);
  });
  it('skips anything that is not in the catalog', () => {
    expect(cartLines({ 'atlantis-4': 1 }, catalog)).toEqual([]);
  });
});

describe('totals', () => {
  it('adds up packs, cans and money across the cart', () => {
    expect(totals({ 'mexico-4': 2, 'italy-12': 1, starter: 1 }, catalog)).toEqual({
      packs: 4,
      cans: 26,
      subtotalCents: 8500,
    });
  });
  it('is all zeros for an empty cart', () => {
    expect(totals({}, catalog)).toEqual({ packs: 0, cans: 0, subtotalCents: 0 });
  });
});

describe('parseCart', () => {
  it('reads back a saved cart', () => {
    expect(parseCart('{"mexico-4":2}')).toEqual({ 'mexico-4': 2 });
  });
  it('returns an empty cart for text that is not a cart', () => {
    expect(parseCart('not json')).toEqual({});
    expect(parseCart(null)).toEqual({});
    expect(parseCart('[1,2]')).toEqual({});
  });
  it('drops lines whose quantity is not a whole number from 1 to 24', () => {
    expect(parseCart('{"mexico-4":0,"italy-12":2.5,"starter":"3","x":99,"ok":3}')).toEqual({ ok: 3 });
  });
});

describe('formatMoney', () => {
  it('shows cents as dollars with two decimals', () => {
    expect(formatMoney(1400)).toBe('$14.00');
    expect(formatMoney(8550)).toBe('$85.50');
  });
});

describe('quiz recommend', () => {
  it('picks the drink chosen most often', () => {
    expect(recommend(['italy', 'japan', 'italy'])).toBe('italy');
  });
  it('breaks a three-way tie with the first answer', () => {
    expect(recommend(['japan', 'mexico', 'italy'])).toBe('japan');
  });
  it('has no recommendation until something is answered', () => {
    expect(recommend([])).toBe(null);
  });
});
