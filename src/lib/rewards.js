// Rewards club logic. Pure functions: a member is a plain object of
// { joined, points, stamps }, where stamps are the countries tried so far.
// Nothing here touches the page or storage (see src/scripts/rewards-store.js).
// The numbers (points per dollar, what a reward costs) live in
// src/data/rewards.js and are passed in as `rules`.
const MAX_POINTS = 1_000_000;

export function newMember() {
  return { joined: false, points: 0, stamps: [] };
}

export function join(member, rules) {
  if (member.joined) return member;
  return { joined: true, points: rules.welcomePoints, stamps: [] };
}

export function pointsFor(cents, rules) {
  return Math.floor(cents / 100) * rules.pointsPerDollar;
}

// What the member could take off this order, in cents: one reward per order.
export function discountFor(member, subtotalCents, rules) {
  const ready = member.joined && member.points >= rules.rewardPoints && subtotalCents >= rules.rewardCents;
  return ready ? rules.rewardCents : 0;
}

export function toNext(member, rules) {
  return Math.max(0, rules.rewardPoints - member.points);
}

// The countries an order covers. The starter pack holds every drink.
export function stampsFor(skus, catalog, allKeys) {
  const found = new Set();
  for (const sku of skus) {
    const item = catalog[sku];
    if (!item) continue;
    if (item.key === 'starter') allKeys.forEach((k) => found.add(k));
    else if (allKeys.includes(item.key)) found.add(item.key);
  }
  return allKeys.filter((k) => found.has(k));
}

// Place an order: spend a reward if asked and earned, then earn points on
// what is left to pay, and stamp the countries in the order.
export function settle(member, { subtotalCents, keys, useReward }, rules) {
  if (!member.joined) return { member, discountCents: 0, earned: 0, totalCents: subtotalCents };
  const discountCents = useReward ? discountFor(member, subtotalCents, rules) : 0;
  const totalCents = subtotalCents - discountCents;
  const earned = pointsFor(totalCents, rules);
  const spent = discountCents > 0 ? rules.rewardPoints : 0;
  const stamps = [...member.stamps, ...keys.filter((k) => !member.stamps.includes(k))];
  return {
    member: { joined: true, points: member.points - spent + earned, stamps },
    discountCents,
    earned,
    totalCents,
  };
}

// Whatever is in the browser's storage is untrusted: keep only what makes sense.
export function parseMember(text, allKeys) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return newMember();
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.joined !== true) return newMember();
  const points = Number.isInteger(data.points) && data.points >= 0 && data.points <= MAX_POINTS ? data.points : 0;
  const saved = Array.isArray(data.stamps) ? data.stamps : [];
  return { joined: true, points, stamps: allKeys.filter((k) => saved.includes(k)) };
}
