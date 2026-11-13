import { describe, it, expect } from 'vitest';
import { trialSummary } from '../src/lib/trial.js';

const drinks = [
  { key: 'mexico', name: 'Prickly Pear Agave Paloma' },
  { key: 'italy', name: 'Italian Summer Spritz' },
  { key: 'japan', name: 'Japanese Yuzu Gin Fizz' },
];

describe('trialSummary', () => {
  it('describes a one-drink trial for a bar', () => {
    expect(trialSummary('bar', ['italy'], drinks)).toBe('A 90-day trial of the Italian Summer Spritz, in cases of 12, for a bar.');
  });
  it('joins two drinks with "and"', () => {
    expect(trialSummary('restaurant', ['mexico', 'japan'], drinks)).toBe(
      'A 90-day trial of the Prickly Pear Agave Paloma and the Japanese Yuzu Gin Fizz, in cases of 12, for a restaurant.'
    );
  });
  it('lists three drinks with commas and "and"', () => {
    expect(trialSummary('grocery', ['mexico', 'italy', 'japan'], drinks)).toBe(
      'A 90-day trial of the Prickly Pear Agave Paloma, the Italian Summer Spritz and the Japanese Yuzu Gin Fizz, in cases of 12, for a grocery store.'
    );
  });
  it('lists drinks in menu order whatever order they were ticked in', () => {
    expect(trialSummary('bar', ['japan', 'mexico'], drinks)).toContain('the Prickly Pear Agave Paloma and the Japanese Yuzu Gin Fizz');
  });
  it('ignores drinks that do not exist and repeats', () => {
    expect(trialSummary('bar', ['italy', 'atlantis', 'italy'], drinks)).toBe('A 90-day trial of the Italian Summer Spritz, in cases of 12, for a bar.');
  });
  it('has nothing to say when no drink is chosen', () => {
    expect(trialSummary('bar', [], drinks)).toBeNull();
  });
  it('has nothing to say for a kind of venue it does not know', () => {
    expect(trialSummary('spaceship', ['italy'], drinks)).toBeNull();
  });
});
