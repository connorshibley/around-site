// The three Ar0und drinks, and what the shop sells.
//
// WHERE THIS CAME FROM
//   From Connor's campaign posters: country, name, line.
//   Drafted by Claude at Connor's request ("invent this"), and his to change:
//     taste, origin, profile, tryNext, every price, and the starter pack.
//   Nothing here is a nutrition or ingredient claim.
//
// `label` gives the colours each can is printed in. The decoration itself
// (tiles, landmarks, the logo's globe) is taken from the group's can mock-ups:
// see scripts/labels/. The lettering is drawn by src/scripts/scene/labels.js.
// `map` is where the dotted country map sits in the window between the tiles:
// width and height in label pixels, and how far down the label its centre is.
// `lat`/`lon` is where the globe lands.
export const drinks = [
  {
    key: 'mexico',
    tag: 1,
    country: 'Mexico',
    name: 'Prickly Pear Agave Paloma',
    short: 'Paloma',
    line: 'Bold. Vibrant. Sun-soaked.',
    taste: 'Prickly pear and pink grapefruit over agave, finished with lime and a pinch of sea salt.',
    origin: 'The Paloma is the cantina classic of Mexico: grapefruit, lime and salt, served long over ice. Ours keeps the grapefruit bite and adds prickly pear, the fruit of the nopal cactus.',
    profile: { Sweetness: 3, Fizz: 4, Citrus: 4, Herbal: 1, Bitterness: 2 },
    tryNext: 'italy',
    lat: 23.6,
    lon: -102.5,
    label: { ground: '#f3f1ec', ink: '#1c1a19', mapInk: '#77726e', map: { w: 336, h: 222, t: 0.197 } },
  },
  {
    key: 'italy',
    tag: 2,
    country: 'Italy',
    name: 'Italian Summer Spritz',
    short: 'Summer Spritz',
    line: 'Bright. Bubbly. Effortlessly Italian.',
    taste: 'Bitter orange and garden herbs lifted with a lot of bubbles. The first drink of a long evening.',
    origin: 'The spritz belongs to aperitivo hour in northern Italy, the drink before dinner that is as much about the terrace as the glass. Ours is bittersweet orange, herbs and sparkle.',
    profile: { Sweetness: 2, Fizz: 5, Citrus: 4, Herbal: 4, Bitterness: 4 },
    tryNext: 'japan',
    lat: 42.5,
    lon: 12.5,
    label: { ground: '#f3eee6', ink: '#7a382e', map: { w: 282, h: 312, t: 0.19 } },
  },
  {
    key: 'japan',
    tag: 3,
    country: 'Japan',
    name: 'Japanese Yuzu Gin Fizz',
    short: 'Yuzu Gin Fizz',
    line: 'Crisp. Citrusy. Wonderfully refined.',
    taste: 'Sharp, fragrant yuzu and juniper botanicals with a clean, dry, sparkling finish.',
    origin: 'Japanese bartending is known for precision, and the fizz is one of its quiet tests. Ours is built around yuzu, the citrus that sits somewhere between lemon, mandarin and grapefruit.',
    profile: { Sweetness: 2, Fizz: 4, Citrus: 5, Herbal: 3, Bitterness: 1 },
    tryNext: 'mexico',
    lat: 36.5,
    lon: 138.5,
    label: { ground: '#7a382e', ink: '#f6efe4', map: { w: 270, h: 300, t: 0.185 } },
  },
];

export const drinkByKey = Object.fromEntries(drinks.map((d) => [d.key, d]));

// Sample prices for the demo shop, in cents.
export const packs = [
  { size: 4, cents: 1400 },
  { size: 8, cents: 2600 },
  { size: 12, cents: 3600 },
];

export const starter = {
  sku: 'starter',
  name: 'World Tour starter pack',
  detail: 'Two of each drink, six cans',
  cans: 6,
  cents: 2100,
};

// Everything the cart can hold, keyed by SKU (for example "mexico-8").
export function buildCatalog() {
  const catalog = { [starter.sku]: { ...starter, key: 'starter' } };
  for (const d of drinks) {
    for (const p of packs) {
      catalog[`${d.key}-${p.size}`] = {
        name: d.name,
        detail: `${p.size}-pack`,
        cans: p.size,
        cents: p.cents,
        key: d.key,
      };
    }
  }
  return catalog;
}
