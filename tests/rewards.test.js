import { describe, it, expect } from 'vitest';
import { newMember, join, pointsFor, discountFor, toNext, stampsFor, settle, parseMember } from '../src/lib/rewards.js';

const rules = { pointsPerDollar: 1, welcomePoints: 50, rewardPoints: 100, rewardCents: 500 };
const keys = ['mexico', 'italy', 'japan'];
const catalog = {
  'mexico-4': { key: 'mexico', cents: 1400 },
  'italy-12': { key: 'italy', cents: 3600 },
  starter: { key: 'starter', cents: 2100 },
};
const member = (over = {}) => ({ joined: true, points: 0, stamps: [], ...over });

describe('join', () => {
  it('starts someone who has not joined with no points and no stamps', () => {
    expect(newMember()).toEqual({ joined: false, points: 0, stamps: [] });
  });
  it('makes a new member and gives the welcome points', () => {
    expect(join(newMember(), rules)).toEqual({ joined: true, points: 50, stamps: [] });
  });
  it('does not give the welcome points a second time', () => {
    const once = join(newMember(), rules);
    expect(join(once, rules)).toEqual(once);
  });
});

describe('pointsFor', () => {
  it('gives one point for each whole dollar spent', () => {
    expect(pointsFor(2600, rules)).toBe(26);
  });
  it('ignores the cents left over', () => {
    expect(pointsFor(1499, rules)).toBe(14);
  });
  it('gives nothing for nothing', () => {
    expect(pointsFor(0, rules)).toBe(0);
  });
});

describe('discountFor', () => {
  it('offers the reward to a member with enough points', () => {
    expect(discountFor(member({ points: 100 }), 2600, rules)).toBe(500);
  });
  it('offers nothing to a member who is short of points', () => {
    expect(discountFor(member({ points: 99 }), 2600, rules)).toBe(0);
  });
  it('offers nothing to someone who has not joined', () => {
    expect(discountFor({ joined: false, points: 400, stamps: [] }, 2600, rules)).toBe(0);
  });
  it('offers nothing when the order is smaller than the reward', () => {
    expect(discountFor(member({ points: 100 }), 400, rules)).toBe(0);
  });
});

describe('toNext', () => {
  it('counts the points still needed for a reward', () => {
    expect(toNext(member({ points: 64 }), rules)).toBe(36);
  });
  it('is zero once a reward is ready', () => {
    expect(toNext(member({ points: 130 }), rules)).toBe(0);
  });
});

describe('stampsFor', () => {
  it('names each country in the order once', () => {
    expect(stampsFor(['mexico-4', 'italy-12', 'mexico-4'], catalog, keys)).toEqual(['mexico', 'italy']);
  });
  it('counts the starter pack as every country', () => {
    expect(stampsFor(['starter'], catalog, keys)).toEqual(['mexico', 'italy', 'japan']);
  });
  it('ignores packs the shop does not sell', () => {
    expect(stampsFor(['atlantis-4'], catalog, keys)).toEqual([]);
  });
});

describe('settle', () => {
  it('earns points on the order and stamps the countries', () => {
    const out = settle(member({ points: 50 }), { subtotalCents: 3600, keys: ['italy'], useReward: false }, rules);
    expect(out).toEqual({
      member: { joined: true, points: 86, stamps: ['italy'] },
      discountCents: 0,
      earned: 36,
      totalCents: 3600,
    });
  });
  it('spends the reward points and earns on what is left to pay', () => {
    const out = settle(member({ points: 120 }), { subtotalCents: 2600, keys: ['japan'], useReward: true }, rules);
    expect(out.discountCents).toBe(500);
    expect(out.totalCents).toBe(2100);
    expect(out.earned).toBe(21);
    expect(out.member.points).toBe(120 - 100 + 21);
  });
  it('does not spend the reward unless asked', () => {
    const out = settle(member({ points: 120 }), { subtotalCents: 2600, keys: [], useReward: false }, rules);
    expect(out.discountCents).toBe(0);
    expect(out.member.points).toBe(146);
  });
  it('cannot spend a reward the member has not earned', () => {
    const out = settle(member({ points: 40 }), { subtotalCents: 2600, keys: [], useReward: true }, rules);
    expect(out.discountCents).toBe(0);
    expect(out.totalCents).toBe(2600);
  });
  it('keeps stamps already collected and adds no duplicates', () => {
    const out = settle(member({ stamps: ['italy'] }), { subtotalCents: 1400, keys: ['italy', 'mexico'], useReward: false }, rules);
    expect(out.member.stamps).toEqual(['italy', 'mexico']);
  });
  it('gives someone who has not joined no points and no stamps', () => {
    const guest = newMember();
    const out = settle(guest, { subtotalCents: 3600, keys: ['italy'], useReward: true }, rules);
    expect(out).toEqual({ member: guest, discountCents: 0, earned: 0, totalCents: 3600 });
  });
  it('does not change the member it was given', () => {
    const before = member({ points: 10, stamps: ['japan'] });
    settle(before, { subtotalCents: 1400, keys: ['mexico'], useReward: false }, rules);
    expect(before).toEqual({ joined: true, points: 10, stamps: ['japan'] });
  });
});

describe('parseMember', () => {
  it('reads back a saved member', () => {
    expect(parseMember('{"joined":true,"points":64,"stamps":["mexico"]}', keys)).toEqual({ joined: true, points: 64, stamps: ['mexico'] });
  });
  it('treats missing or broken storage as someone who has not joined', () => {
    expect(parseMember(null, keys)).toEqual(newMember());
    expect(parseMember('{not json', keys)).toEqual(newMember());
    expect(parseMember('[1,2]', keys)).toEqual(newMember());
  });
  it('throws away points that are not a sensible whole number', () => {
    expect(parseMember('{"joined":true,"points":-5,"stamps":[]}', keys).points).toBe(0);
    expect(parseMember('{"joined":true,"points":"lots","stamps":[]}', keys).points).toBe(0);
    expect(parseMember('{"joined":true,"points":1e12,"stamps":[]}', keys).points).toBe(0);
  });
  it('keeps only stamps for countries that exist, once each', () => {
    expect(parseMember('{"joined":true,"points":1,"stamps":["japan","atlantis","japan",7]}', keys).stamps).toEqual(['japan']);
  });
  it('gives no points or stamps to someone who has not joined', () => {
    expect(parseMember('{"joined":false,"points":900,"stamps":["japan"]}', keys)).toEqual(newMember());
  });
});
