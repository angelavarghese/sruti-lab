// math.js - Pure mathematical functions for Carnatic music theory, tuning, and rhythm

import { riGaPairs, dhaNiPairs } from './data.js';

/**
 * Converts a ratio (number or exact fraction {num, den}) to cents (3 decimal places).
 */
export function cents(ratio) {
  const val = typeof ratio === 'object' && ratio !== null ? ratio.num / ratio.den : ratio;
  return Number((1200 * Math.log2(val)).toFixed(3));
}

/**
 * Calculates frequency in Hz given Sa frequency and a ratio.
 */
export function freq(saHz, ratio) {
  const val = typeof ratio === 'object' && ratio !== null ? ratio.num / ratio.den : ratio;
  return Number((saHz * val).toFixed(2));
}

/**
 * Calculates deviation in cents between a tuning ratio and its corresponding 12-TET ratio.
 */
export function deviation(tuningRatio, tetRatio) {
  const cTuning = cents(tuningRatio);
  const cTet = cents(tetRatio);
  return Number((cTuning - cTet).toFixed(2));
}

/**
 * Maps a Melakarta number (1 to 72) to its swarasthana names and semitone indices.
 */
// math.js (Update melaToSwaras function)

export function melaToSwaras(n) {
  if (n < 1 || n > 72) {
    throw new Error("Melakarta number must be between 1 and 72");
  }

  const ma = n <= 36 ? 'M1' : 'M2';
  const maSemitone = n <= 36 ? 5 : 6;

  const riGaIndex = Math.floor((n - 1) / 6) % 6;
  const dhaNiIndex = (n - 1) % 6;

  const { r, g } = riGaPairs[riGaIndex];
  const { d, n: ni } = dhaNiPairs[dhaNiIndex];

  const swaraSemidict = {
    'S': 0,
    'R1': 1, 'R2': 2, 'R3': 3,
    'G1': 2, 'G2': 3, 'G3': 4,
    'M1': 5, 'M2': 6,
    'P': 7,
    'D1': 8, 'D2': 9, 'D3': 10,
    'N1': 9, 'N2': 10, 'N3': 11
  };

  return {
    melaNumber: n,
    swaras: {
      S: { name: 'S', semitone: 0 },
      R: { name: r, semitone: swaraSemidict[r] },
      G: { name: g, semitone: swaraSemidict[g] },
      M: { name: ma, semitone: maSemitone },
      P: { name: 'P', semitone: 7 },
      D: { name: d, semitone: swaraSemidict[d] },
      N: { name: ni, semitone: swaraSemidict[ni] },
      S_upper: { name: "Ṡ", semitone: 12 } // Upper Sa (Octave)
    },
    namesList: ['S', r, g, ma, 'P', d, ni, "Ṡ"],
    semitonesList: [0, swaraSemidict[r], swaraSemidict[g], maSemitone, 7, swaraSemidict[d], swaraSemidict[ni], 12]
  };
}

/**
 * Calculates the Pythagorean comma (12 fifths vs 7 octaves).
 */
export function commaStack() {
  const num = 531441;
  const den = 524288;
  const ratio = { num, den };
  
  return {
    ratio,
    decimal: Number((num / den).toFixed(6)),
    cents: Number(cents(ratio))
  };
}

/**
 * Solves Korvai parameters (p, g) given tala aksharas, gati, avartanas, and options.
 */
export function solveKorvai(aksharas, gati, avartanas, options = {}) {
  const { minP = 1, maxGapRatio = 1 } = options;
  const totalUnits = aksharas * gati * avartanas;
  const results = [];

  for (let p = minP; 3 * p < totalUnits; p++) {
    const remainder = totalUnits - (3 * p);
    if (remainder >= 0 && remainder % 2 === 0) {
      const g = remainder / 2;
      const maxG = p * maxGapRatio;
      if (g <= maxG) {
        results.push({ p, g, total: totalUnits });
      }
    }
  }

  return results;
}