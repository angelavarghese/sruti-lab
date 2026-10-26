// app.js - UI Bindings, Audio Playback, and Interactivity
import { ratioTables, melakartaChakras, gatiList } from './js/data.js';
import { melaToSwaras, freq, cents, commaStack, solveKorvai } from './js/math.js';
import { playNote, playScale, startDrone, stopDrone, hit, scheduleEvents, stopScheduler } from './js/audio.js';

const saHz = 240;
let isDroneActive = false;

// --- 1. Melakarta UI & Audio Handler ---
const melaInput = document.getElementById('melaInput');
const swaraGrid = document.getElementById('swaraGrid');
const melaNameDisplay = document.getElementById('melaNameDisplay');
const playScaleBtn = document.getElementById('playScaleBtn');
const droneBtn = document.getElementById('droneBtn');

// app.js (Melakarta UI & Audio Section Update)

function getCurrentScaleFrequencies() {
  const n = parseInt(melaInput.value) || 1;
  const clampedN = Math.max(1, Math.min(72, n));
  const melaData = melaToSwaras(clampedN);
  
  return melaData.semitonesList.map(semitone => {
    if (semitone === 12) return saHz * 2; // Upper Sa octave multiplier
    const ratio = ratioTables.ji[semitone];
    return freq(saHz, ratio);
  });
}

function updateMelakarta() {
  const n = parseInt(melaInput.value) || 1;
  const clampedN = Math.max(1, Math.min(72, n));
  const melaData = melaToSwaras(clampedN);

  const chakraIndex = Math.floor((clampedN - 1) / 6);
  const chakraName = melakartaChakras[chakraIndex];
  melaNameDisplay.textContent = `Chakra: ${chakraName} (${clampedN}/72)`;

  swaraGrid.innerHTML = '';
  const swaraKeys = ['S', 'R', 'G', 'M', 'P', 'D', 'N', 'S_upper'];

  swaraKeys.forEach(key => {
    const swaraObj = melaData.swaras[key];
    const semitone = swaraObj.semitone;
    const hz = semitone === 12 ? saHz * 2 : freq(saHz, ratioTables.ji[semitone]);

    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col items-center justify-between cursor-pointer hover:border-amber-400 transition';
    card.innerHTML = `
      <span class="text-xs text-slate-400 font-semibold">${key === 'S_upper' ? "Ṡ" : key}</span>
      <span class="text-lg font-bold text-amber-400 my-1">${swaraObj.name}</span>
      <span class="text-xs text-slate-500">${hz} Hz</span>
    `;

    card.addEventListener('click', () => playNote(hz, 0.6));
    swaraGrid.appendChild(card);
  });
}
melaInput.addEventListener('input', updateMelakarta);
updateMelakarta();

playScaleBtn.addEventListener('click', () => {
  const freqs = getCurrentScaleFrequencies(); // [S, R, G, M, P, D, N, S_upper]
  
  // Ascend up to S_upper, play S_upper twice, then descend back down to S
  const fullCycle = [
    ...freqs, 
    freqs[freqs.length - 1], // Second S_upper
    ...freqs.slice(0, -1).reverse() // N down to S
  ];

  playScale(fullCycle, 140);
});

droneBtn.addEventListener('click', () => {
  if (isDroneActive) {
    stopDrone();
    droneBtn.textContent = 'Toggle Drone';
    droneBtn.classList.remove('bg-amber-500', 'text-slate-950');
    droneBtn.classList.add('bg-slate-700', 'text-amber-300');
    isDroneActive = false;
  } else {
    startDrone(saHz);
    droneBtn.textContent = 'Stop Drone';
    droneBtn.classList.remove('bg-slate-700', 'text-amber-300');
    droneBtn.classList.add('bg-amber-500', 'text-slate-950');
    isDroneActive = true;
  }
});

// --- 2. Tuning & Comma Demo Handler ---
const tuningSelect = document.getElementById('tuningSelect');
const tuningDetails = document.getElementById('tuningDetails');
const commaDisplay = document.getElementById('commaDisplay');

function updateTuning() {
  const selectedType = tuningSelect.value;
  const table = ratioTables[selectedType];

  tuningDetails.innerHTML = '';
  table.forEach((item, index) => {
    const c = cents(item);
    const row = document.createElement('div');
    row.className = 'flex justify-between border-b border-slate-700/50 py-1 text-xs';
    const ratioStr = typeof item === 'object' ? `${item.num}/${item.den}` : item;
    row.innerHTML = `<span>Semitone ${index}</span> <span class="font-mono text-amber-300">${ratioStr}</span> <span class="text-slate-400">${c} cents</span>`;
    tuningDetails.appendChild(row);
  });
}

tuningSelect.addEventListener('change', updateTuning);
updateTuning();

const comma = commaStack();
commaDisplay.innerHTML = `
  <div class="flex justify-between"><span class="text-slate-400">Exact Ratio:</span> <span class="font-mono text-amber-300">${comma.ratio.num} / ${comma.ratio.den}</span></div>
  <div class="flex justify-between"><span class="text-slate-400">Decimal:</span> <span class="font-mono text-amber-300">${comma.decimal}</span></div>
  <div class="flex justify-between"><span class="text-slate-400">Cents Difference:</span> <span class="font-mono text-amber-400 font-bold">${comma.cents} ¢</span></div>
`;

// --- 3. Korvai Solver & Playback Handler ---
const korvaiAksharas = document.getElementById('korvaiAksharas');
const korvaiGati = document.getElementById('korvaiGati');
const korvaiAvartanas = document.getElementById('korvaiAvartanas');
const solveBtn = document.getElementById('solveBtn');
const korvaiResults = document.getElementById('korvaiResults');

function playKorvai(p, g) {
  stopScheduler();
  const tempoBpm = 110;
  const beatTime = 60 / tempoBpm;
  const subBeatTime = beatTime / 4; // Chatusra subdivision reference

  const events = [];
  let currentTime = 0;

  // Standard 3-repetition Korvai structure: Phrase(p) + Gap(g) + Phrase(p) + Gap(g) + Phrase(p) [landing on Sama]
  const patternStructure = [
    { type: 'phrase', count: p },
    { type: 'gap', count: g },
    { type: 'phrase', count: p },
    { type: 'gap', count: g },
    { type: 'phrase', count: p }
  ];

  patternStructure.forEach((block, blockIdx) => {
    for (let i = 0; i < block.count; i++) {
      events.push({
        time: currentTime,
        type: block.type === 'phrase' ? 'syllable' : 'wave'
      });
      currentTime += subBeatTime;
    }
  });

  // Final Samam hit (clap / sama)
  events.push({
    time: currentTime,
    type: 'sama'
  });

  scheduleEvents(events);
}

function runKorvaiSolver() {
  const ak = parseInt(korvaiAksharas.value) || 8;
  const ga = parseInt(korvaiGati.value) || 4;
  const av = parseInt(korvaiAvartanas.value) || 1;

  const solutions = solveKorvai(ak, ga, av, { minP: 1, maxGapRatio: 10 });

  korvaiResults.innerHTML = '';
  if (solutions.length === 0) {
    korvaiResults.innerHTML = '<span class="text-xs text-slate-500">No solutions found.</span>';
    return;
  }

  solutions.forEach(s => {
    const pill = document.createElement('button');
    pill.className = 'bg-slate-800 border border-slate-600 hover:border-amber-400 rounded px-3 py-1.5 text-xs font-mono text-amber-300 transition cursor-pointer text-left';
    pill.innerHTML = `p = <strong class="text-white">${s.p}</strong>, g = <strong class="text-white">${s.g}</strong> <span class="text-slate-500 text-[10px]">(${3 * s.p} + ${2 * s.g} = ${s.total})</span>`;
    
    pill.addEventListener('click', () => playKorvai(s.p, s.g));
    korvaiResults.appendChild(pill);
  });
}

solveBtn.addEventListener('click', runKorvaiSolver);
runKorvaiSolver();