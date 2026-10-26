// test.js - Console assertions for Carnatic math and tuning functions
import { cents, commaStack, melaToSwaras, solveKorvai } from './math.js';

console.log('--- Running Tests ---');

// Helper function for float assertions
function assertAlmostEqual(actual, expected, tolerance = 0.01, label = '') {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`❌ FAILED: ${label} -> Expected ~${expected}, got ${actual}`);
  } else {
    console.log(`✅ PASSED: ${label} (${actual})`);
  }
}

function assertArrayEqual(actual, expected, label = '') {
  const isSame = actual.length === expected.length && actual.every((val, i) => val === expected[i]);
  if (!isSame) {
    console.error(`❌ FAILED: ${label} -> Expected [${expected}], got [${actual}]`);
  } else {
    console.log(`✅ PASSED: ${label} [${actual}]`);
  }
}

// -------------------------------------------------------------
// Test 1: Specific Melakarta Semitone Mapping
// -------------------------------------------------------------
console.log('\n--- Test 1: Specific Melakarta Semitones ---');

// Mela 1 (Kanakangi): S R1 G1 M1 P D1 N1 -> [0, 1, 2, 5, 7, 8, 9]
assertArrayEqual(melaToSwaras(1).semitonesList, [0, 1, 2, 5, 7, 8, 9], 'Mela 1 (Kanakangi)');

// Mela 15 (Mayamalavagowla): S R1 G3 M1 P D1 N3 -> [0, 1, 4, 5, 7, 8, 11]
assertArrayEqual(melaToSwaras(15).semitonesList, [0, 1, 4, 5, 7, 8, 11], 'Mela 15 (Mayamalavagowla)');

// Mela 29 (Dheerasankarabharanam): S R2 G3 M1 P D2 N3 -> [0, 2, 4, 5, 7, 9, 11]
assertArrayEqual(melaToSwaras(29).semitonesList, [0, 2, 4, 5, 7, 9, 11], 'Mela 29 (Sankarabharanam)');

// Mela 36 (Chalanata): S R3 G3 M1 P D3 N3 -> [0, 3, 4, 5, 7, 10, 11]
assertArrayEqual(melaToSwaras(36).semitonesList, [0, 3, 4, 5, 7, 10, 11], 'Mela 36 (Chalanata)');

// Mela 65 (Mechakalyani): S R2 G3 M2 P D2 N3 -> [0, 2, 4, 6, 7, 9, 11]
assertArrayEqual(melaToSwaras(65).semitonesList, [0, 2, 4, 6, 7, 9, 11], 'Mela 65 (Kalyani)');

// Mela 72 (Rasikapriya): S R3 G3 M2 P D3 N3 -> [0, 3, 4, 6, 7, 10, 11]
assertArrayEqual(melaToSwaras(72).semitonesList, [0, 3, 4, 6, 7, 10, 11], 'Mela 72 (Rasikapriya)');


// -------------------------------------------------------------
// Test 2: Invariant Check across all 72 Melakartas
// -------------------------------------------------------------
console.log('\n--- Test 2: Invariant Check Across All 72 Melakartas ---');
let all72Valid = true;

for (let i = 1; i <= 72; i++) {
  const { semitonesList, namesList } = melaToSwaras(i);
  
  // Check 7 swaras present
  if (semitonesList.length !== 7 || namesList.length !== 7) {
    console.error(`❌ Mela ${i}: Does not have 7 swaras.`);
    all72Valid = false;
  }

  // Check strict ascending pitch order
  for (let j = 0; j < semitonesList.length - 1; j++) {
    if (semitonesList[j] >= semitonesList[j + 1]) {
      console.error(`❌ Mela ${i}: Non-ascending semitone progression at index ${j} (${semitonesList[j]} >= ${semitonesList[j+1]})`);
      all72Valid = false;
    }
  }

  // Check unique swara position/role labels (S, R, G, M, P, D, N)
  const swaraPositions = namesList.map(n => n[0]);
  const uniquePositions = new Set(swaraPositions);
  if (uniquePositions.size !== 7) {
    console.error(`❌ Mela ${i}: Duplicate swara positions found: ${namesList}`);
    all72Valid = false;
  }
}

if (all72Valid) {
  console.log('✅ PASSED: All 72 Melakartas produce 7 strictly ascending, distinct semitones without duplicate swara roles.');
}


// -------------------------------------------------------------
// Test 3: Cents & Pythagorean Comma Calculations
// -------------------------------------------------------------
console.log('\n--- Test 3: Cents & Comma Calculations ---');

// cents(3/2) ≈ 701.955 -> 701.96
assertAlmostEqual(cents(3 / 2), 701.955, 0.01, 'cents(3/2) Perfect Fifth');

// cents(5/4) ≈ 386.314 -> 386.31
assertAlmostEqual(cents(5 / 4), 386.314, 0.01, 'cents(5/4) Major Third');

// Pythagorean Comma ≈ 23.46 cents
const commaRes = commaStack();
assertAlmostEqual(commaRes.cents, 23.46, 0.01, 'Pythagorean Comma (cents)');


// -------------------------------------------------------------
// Test 4: Korvai Solutions (Adi, Chatusra, 1 Avartana = 32 pulses)
// -------------------------------------------------------------
console.log('\n--- Test 4: Korvai Solutions ---');

// Adi tala = Triputa (chatusra) = 8 aksharas. Gati = chatusra (4). 1 Avartana = 32 pulses.
// minP = 1, maxGapRatio = 10 (relaxed to verify presence of specific pairs)
const korvaiSolutions = solveKorvai(8, 4, 1, { minP: 1, maxGapRatio: 10 });

const has10_1 = korvaiSolutions.some(s => s.p === 10 && s.g === 1);
const has8_4 = korvaiSolutions.some(s => s.p === 8 && s.g === 4);

if (has10_1) {
  console.log('✅ PASSED: Korvai solver included pair (10, 1) -> 3(10) + 2(1) = 32');
} else {
  console.error('❌ FAILED: Korvai solver missing pair (10, 1)');
}

if (has8_4) {
  console.log('✅ PASSED: Korvai solver included pair (8, 4) -> 3(8) + 2(4) = 32');
} else {
  console.error('❌ FAILED: Korvai solver missing pair (8, 4)');
}

console.log('\n--- All Tests Completed ---');