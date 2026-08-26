import { repairDictatedNumbers } from '../src/lib/dictation';

/**
 * The offline recogniser hears "two plate chicken" as "to plate chicken".
 *
 * Half these cases are about what must NOT change. A rewrite that turns a real
 * preposition into a quantity silently doubles a portion, and the user's only
 * defence is reading a transcript they believe reflects what they said — so the
 * false positives matter more here than the fixes do.
 */

describe('repairs a misheard quantity', () => {
  it('reads "to plate" as two plates — the reported case', () => {
    expect(repairDictatedNumbers('to plate chicken')).toBe('two plate chicken');
  });

  it('handles the other spelling of the same sound', () => {
    expect(repairDictatedNumbers('too bowls of dal')).toBe('two bowls of dal');
  });

  it('covers the rest of the confusable numbers', () => {
    expect(repairDictatedNumbers('for cups of rice')).toBe('four cups of rice');
    expect(repairDictatedNumbers('ate slices of bread')).toBe('eight slices of bread');
    expect(repairDictatedNumbers('won glass of milk')).toBe('one glass of milk');
  });

  it('works on Tamil vessels, which is where this matters most', () => {
    expect(repairDictatedNumbers('to thattu rice')).toBe('two thattu rice');
    expect(repairDictatedNumbers('for kinnam sambar')).toBe('four kinnam sambar');
  });

  it('repairs mid-sentence, not just at the start', () => {
    expect(repairDictatedNumbers('dal and to bowls of curd')).toBe(
      'dal and two bowls of curd',
    );
  });

  it('survives the punctuation a final result adds', () => {
    expect(repairDictatedNumbers('to, plate chicken')).toBe('two, plate chicken');
  });

  it('leaves the rest of the sentence untouched', () => {
    expect(repairDictatedNumbers('to plate  chicken')).toBe('two plate  chicken');
  });
});

describe('leaves real words alone', () => {
  it('does not turn a preposition into a quantity', () => {
    // The case that makes a naive find-and-replace dangerous.
    expect(repairDictatedNumbers('chicken for lunch')).toBe('chicken for lunch');
    expect(repairDictatedNumbers('went to the canteen')).toBe('went to the canteen');
  });

  it('requires the vessel to be adjacent, not merely present', () => {
    // "to" and "plate" are both here, and it is still not a quantity.
    expect(repairDictatedNumbers('I gave it to Ravi, plate of rice')).toBe(
      'I gave it to Ravi, plate of rice',
    );
  });

  it('does not fire before a food, only before a vessel', () => {
    // Foods live in the corpus and change constantly; guessing at them is how a
    // preposition becomes a quantity.
    expect(repairDictatedNumbers('to chicken')).toBe('to chicken');
  });

  it('leaves a correct number alone', () => {
    expect(repairDictatedNumbers('two plate chicken')).toBe('two plate chicken');
  });

  it('does not guess between fifty and fifteen', () => {
    // Both are plausible quantities, so there is no safe direction — and a
    // wrong guess silently triples a portion.
    expect(repairDictatedNumbers('fifty grams of nuts')).toBe('fifty grams of nuts');
  });

  it('handles empty and whitespace input', () => {
    expect(repairDictatedNumbers('')).toBe('');
    expect(repairDictatedNumbers('   ')).toBe('   ');
  });

  it('does not corrupt a word that merely contains a homophone', () => {
    expect(repairDictatedNumbers('tomato plate')).toBe('tomato plate');
    expect(repairDictatedNumbers('forty plates')).toBe('forty plates');
  });
});
