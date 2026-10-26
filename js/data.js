// data.js - Carnatic Music Theory & Tuning Data Structures

// 1. Pitch-class map (semitones 0-11) covering all 15 swarasthana names
export const swarasthanaMap = {
  0:  { semitone: 0,  names: ['S'] },
  1:  { semitone: 1,  names: ['R1'] },
  2:  { semitone: 2,  names: ['R2', 'G1'] },
  3:  { semitone: 3,  names: ['R3', 'G2'] },
  4:  { semitone: 4,  names: ['G3'] },
  5:  { semitone: 5,  names: ['M1'] },
  6:  { semitone: 6,  names: ['M2'] },
  7:  { semitone: 7,  names: ['P'] },
  8:  { semitone: 8,  names: ['D1'] },
  9:  { semitone: 9,  names: ['D2', 'N1'] },
  10: { semitone: 10, names: ['D3', 'N2'] },
  11: { semitone: 11, names: ['N3'] },
  12: { semitone: 12, names: ['S\''] }
};

// 2. Three ratio tables for semitones 0-11 (stored as exact num/den pairs where applicable)
export const ratioTables = {
  // 12-TET frequency multipliers (2^(n/12))
  tet12: Array.from({ length: 12 }, (_, i) => Number(Math.pow(2, i / 12).toFixed(6))),

  // Just Intonation (JI) exact fractions
  ji: [
    { num: 1, den: 1 },     // S
    { num: 16, den: 15 },   // R1
    { num: 9, den: 8 },     // R2/G1
    { num: 6, den: 5 },     // R3/G2
    { num: 5, den: 4 },     // G3
    { num: 4, den: 3 },     // M1
    { num: 45, den: 32 },   // M2
    { num: 3, den: 2 },     // P
    { num: 8, den: 5 },     // D1
    { num: 5, den: 3 },     // D2/N1
    { num: 9, den: 5 },     // D3/N2
    { num: 15, den: 8 }     // N3
  ],

  // Pythagorean tuning exact fractions
  pythagorean: [
    { num: 1, den: 1 },     // S
    { num: 256, den: 243 }, // R1
    { num: 9, den: 8 },     // R2/G1
    { num: 32, den: 27 },   // R3/G2
    { num: 81, den: 64 },   // G3
    { num: 4, den: 3 },     // M1
    { num: 729, den: 512 }, // M2
    { num: 3, den: 2 },     // P
    { num: 128, den: 81 },  // D1
    { num: 27, den: 16 },   // D2/N1
    { num: 16, den: 9 },    // D3/N2
    { num: 243, den: 128 }  // N3
  ]
};

// 3. Suladi Sapta Tāla definitions (Aksharas + Vibhāga splits)
export const talaDefinitions = {
  dhruva:  { aksharas: 14, vibhagas: [4, 2, 4, 4] },
  matya:   { aksharas: 10, vibhagas: [4, 2, 4] },
  rupaka:  { aksharas: 6,  vibhagas: [2, 4] },
  jhampa:  { aksharas: 10, vibhagas: [7, 1, 2] },
  triputa: { aksharas: 7,  vibhagas: [3, 2, 2] },
  ata:     { aksharas: 14, vibhagas: [5, 5, 2, 2] },
  eka:     { aksharas: 4,  vibhagas: [4] }
};

// 4. Gati list and default konnakol syllables
export const gatiList = {
  tishra:    { aksharas: 3, syllables: ['ta', 'ki', 'ta'] },
  chatusra:  { aksharas: 4, syllables: ['ta', 'ka', 'di', 'mi'] },
  khanda:    { aksharas: 5, syllables: ['ta', 'ka', 'ki', 'ta', 'di'] },
  mishra:    { aksharas: 7, syllables: ['ta', 'ka', 'di', 'mi', 'ta', 'ka', 'di'] },
  sankeerna: { aksharas: 9, syllables: ['ta', 'ka', 'di', 'mi', 'ta', 'ka', 'ki', 'ta', 'di'] }
};

// 5. Melakarta Chakras and Swara Pair Lists in order
export const melakartaChakras = [
  'Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu',
  'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya'
];

export const riGaPairs = [
  { r: 'R1', g: 'G1' },
  { r: 'R1', g: 'G2' },
  { r: 'R1', g: 'G3' },
  { r: 'R2', g: 'G2' },
  { r: 'R2', g: 'G3' },
  { r: 'R3', g: 'G3' }
];

export const dhaNiPairs = [
  { d: 'D1', n: 'N1' },
  { d: 'D1', n: 'N2' },
  { d: 'D1', n: 'N3' },
  { d: 'D2', n: 'N2' },
  { d: 'D2', n: 'N3' },
  { d: 'D3', n: 'N3' }
];

// utils.js or add to data.js

/**
 * Converts a fraction {num, den} or a decimal multiplier into cents.
 * 1 semitone = 100 cents, 1 octave = 1200 cents.
 */
export function ratioToCents(ratio) {
  const value = typeof ratio === 'object' ? ratio.num / ratio.den : ratio;
  return Number((1200 * Math.log2(value)).toFixed(2));
}

/**
 * Converts the entire ratio table (JI or Pythagorean) into an array of cent values.
 */
export function getCentsTable(ratioArray) {
  return ratioArray.map(item => ({
    ...item,
    cents: ratioToCents(item)
  }));
}

/**
 * Calculates the difference in cents between two ratios (useful for comma demos).
 */
export function calculateComma(ratioA, ratioB) {
  const centsA = ratioToCents(ratioA);
  const centsB = ratioToCents(ratioB);
  return Number((Math.abs(centsA - centsB)).toFixed(2));
}