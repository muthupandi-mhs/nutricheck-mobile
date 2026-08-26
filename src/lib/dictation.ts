/**
 * Repairs the number words an offline recogniser reliably gets wrong.
 *
 * Android's on-device models have no context to separate "two" from "to", so
 * "two plate chicken" comes back as "to plate chicken". The backend's parse
 * prompt already reads that correctly — but the user watches the transcript
 * appear as they speak, and a box that says "to plate chicken" reads as broken
 * however right the eventual log is.
 *
 * This is deliberately the narrower half of that pair. The server has the whole
 * sentence, a food corpus and a model; it can afford judgement. Here the only
 * safe rule is a mechanical one, because rewriting a word the user *did* say is
 * worse than leaving one they didn't — they are reading this to decide whether
 * the app heard them.
 */

/**
 * What each mishearing should have been.
 *
 * Only homophones that are genuinely ambiguous to a recogniser. "fifteen" and
 * "fifty" are left alone on purpose: both are plausible quantities, so there is
 * no safe direction to correct in and a wrong guess silently triples a portion.
 */
const MISHEARD: Readonly<Record<string, string>> = {
  to: 'two',
  too: 'two',
  for: 'four',
  fore: 'four',
  ate: 'eight',
  won: 'one',
};

/**
 * The closed list that licenses a correction: vessels and measures.
 *
 * A closed list is the whole safety argument. "chicken for lunch" survives
 * because "lunch" is not a vessel; "to plate chicken" is corrected because
 * "plate" is. Nothing here is a food — foods live in the corpus, change
 * constantly, and guessing at them is how a preposition becomes a quantity.
 */
const VESSELS: ReadonlySet<string> = new Set([
  'plate',
  'plates',
  'bowl',
  'bowls',
  'cup',
  'cups',
  'glass',
  'glasses',
  'tumbler',
  'tumblers',
  'dabara',
  'spoon',
  'spoons',
  'spoonful',
  'tablespoon',
  'tablespoons',
  'teaspoon',
  'teaspoons',
  'slice',
  'slices',
  'piece',
  'pieces',
  'handful',
  'handfuls',
  'packet',
  'packets',
  'tin',
  'tins',
  'bottle',
  'bottles',
  'katori',
  'kinnam',
  'thattu',
]);

/**
 * Rewrite misheard number words that are immediately followed by a vessel.
 *
 * Adjacency is required, not merely proximity. "to" and "plate" being in the
 * same sentence proves nothing — "I gave it to Ravi, plate of rice" would be
 * corrupted by a looser rule. The number has to sit directly in front of the
 * thing it counts, which is where a quantity actually goes.
 *
 * Capitalisation of the original is not preserved: the recogniser lowercases
 * mid-sentence anyway, and a stray "Two" would be more conspicuous than useful.
 */
export function repairDictatedNumbers(phrase: string): string {
  if (!phrase) return phrase;

  // Split on whitespace but keep it, so the user's spacing survives verbatim.
  const parts = phrase.split(/(\s+)/);

  for (let i = 0; i < parts.length; i += 1) {
    const word = parts[i]!;
    // Trailing punctuation is common in a final result: "to, plate".
    const bare = word.toLowerCase().replace(/[.,!?;:]+$/, '');
    const replacement = MISHEARD[bare];
    if (!replacement) continue;

    const next = nextWord(parts, i);
    if (!next || !VESSELS.has(next)) continue;

    parts[i] = word.replace(new RegExp(bare, 'i'), replacement);
  }

  return parts.join('');
}

/** The next non-whitespace token, lowercased and stripped of punctuation. */
function nextWord(parts: string[], from: number): string | null {
  for (let i = from + 1; i < parts.length; i += 1) {
    const candidate = parts[i]!;
    if (/^\s+$/.test(candidate)) continue;
    return candidate.toLowerCase().replace(/[.,!?;:]+$/, '');
  }
  return null;
}
