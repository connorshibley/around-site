// The demo "90-day trial" request on the bars page: turn what was picked into
// one plain sentence. Pure, so it can be tested; nothing is stored or sent.
const VENUES = { bar: 'a bar', restaurant: 'a restaurant', grocery: 'a grocery store' };

export function trialSummary(venue, keys, drinks) {
  const place = VENUES[venue];
  const names = drinks.filter((d) => keys.includes(d.key)).map((d) => `the ${d.name}`);
  if (!place || names.length === 0) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `A 90-day trial of ${list}, in cases of 12, for ${place}.`;
}
