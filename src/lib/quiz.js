// "Where to first?" Each answer names a drink; the drink named most often
// wins, and the earliest answer breaks a tie.
export function recommend(answers) {
  if (!answers.length) return null;
  const counts = {};
  for (const a of answers) counts[a] = (counts[a] || 0) + 1;
  let best = null;
  for (const a of answers) {
    if (best === null || counts[a] > counts[best]) best = a;
  }
  return best;
}
