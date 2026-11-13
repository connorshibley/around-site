// Where the demo rewards club keeps a member: this browser's localStorage and
// nowhere else. There is no account and nothing is sent anywhere.
import { parseMember, join, newMember } from '../lib/rewards.js';
import { rules } from '../data/rewards.js';
import { drinks } from '../data/drinks.js';

const KEY = 'around-club';
export const drinkKeys = drinks.map((d) => d.key);
export { rules };

// localStorage can be missing or blocked, so every access is guarded and the
// member falls back to living in memory for this page view.
let memory = newMember();
export const club = {
  get() {
    try {
      memory = parseMember(localStorage.getItem(KEY), drinkKeys);
    } catch (e) {}
    return memory;
  },
  save(member) {
    memory = member;
    try {
      localStorage.setItem(KEY, JSON.stringify(member));
    } catch (e) {}
    return memory;
  },
  join() {
    return club.save(join(club.get(), rules));
  },
  leave() {
    memory = newMember();
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    return memory;
  },
};
