// app.js - UI Bindings, Audio Playback, and Real-time Korvai Visualizer
import { ratioTables, melakartaChakras, gatiList } from './js/data.js';
import { melaToSwaras, freq, cents, commaStack, solveKorvai } from './js/math.js';
import { playNote, playScale, startDrone, stopDrone, scheduleEvents, loadStrokes } from './js/audio.js';

const saHz = 240;
let isDroneActive = false;

const tuningSelect = document.getElementById('tuningSelect');

// --- 1. Melakarta UI & Audio Handler ---
const melaInput = document.getElementById('melaInput');
const swaraGrid = document.getElementById('swaraGrid');
const melaNameDisplay = document.getElementById('melaNameDisplay');
const playScaleBtn = document.getElementById('playScaleBtn');
const droneBtn = document.getElementById('droneBtn');

function getCurrentScaleFrequencies() {
  const n = parseInt(melaInput.value) || 1;
  const clampedN = Math.max(1, Math.min(72, n));
  const melaData = melaToSwaras(clampedN);
  
  const selectedTuning = tuningSelect.value;
  const table = ratioTables[selectedTuning];

  return melaData.semitonesList.map(semitone => {
    if (semitone === 12) return saHz * 2;
    const item = table[semitone];
    const ratio = (typeof item === 'object' && item !== null) ? item.num / item.den : item;
    return saHz * ratio;
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
  const freqs = getCurrentScaleFrequencies();

  swaraKeys.forEach((key, idx) => {
    const swaraObj = melaData.swaras[key];
    const hz = Math.round(freqs[idx] * 10) / 10;

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

tuningSelect.addEventListener('change', () => {
  updateTuning();
  updateMelakarta();
});

melaInput.addEventListener('input', updateMelakarta);
updateMelakarta();

playScaleBtn.addEventListener('click', () => {
  const freqs = getCurrentScaleFrequencies();
  const fullCycle = [
    ...freqs, 
    freqs[freqs.length - 1], 
    ...freqs.slice(0, -1).reverse()
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

// --- 3. Korvai Solver, Visualizer & Playback Handler ---
const korvaiAksharas = document.getElementById('korvaiAksharas');
const korvaiGati = document.getElementById('korvaiGati');
const korvaiAvartanas = document.getElementById('korvaiAvartanas');
const solveBtn = document.getElementById('solveBtn');
const korvaiResults = document.getElementById('korvaiResults');
const korvaiVisualizer = document.getElementById('korvaiVisualizer');

let tokenElements = [];

function renderVisualizer(tokens) {
  korvaiVisualizer.innerHTML = '';
  tokenElements = [];
  tokens.forEach(t => {
    const span = document.createElement('div');
    span.className = `px-2 py-1 rounded text-xs font-mono transition-all ${
      t.type === 'phrase' ? 'bg-slate-800 text-amber-300 border border-slate-700' :
      t.type === 'gap' ? 'bg-slate-900 text-slate-600' : 'bg-amber-500 text-slate-950 font-bold'
    }`;
    span.textContent = t.text;
    
    // Attach data-sollu attribute for dynamic live highlighting
    if (t.text && t.text !== '·') {
      span.setAttribute('data-sollu', t.text.toLowerCase());
    }

    korvaiVisualizer.appendChild(span);
    tokenElements.push(span);
  });
}

function highlightToken(index) {
  tokenElements.forEach((el, idx) => {
    if (idx === index) {
      el.classList.add('ring-2', 'ring-amber-400', 'scale-110', 'bg-amber-400', 'text-slate-950');
      el.classList.remove('bg-slate-800', 'text-amber-300', 'bg-slate-900', 'text-slate-600', 'bg-amber-500');
    } else {
      el.classList.remove('ring-2', 'ring-amber-400', 'scale-110', 'bg-amber-400', 'text-slate-950');
      const text = el.textContent;
      if (text === '·') {
        el.className = 'px-2 py-1 rounded text-xs font-mono transition-all bg-slate-900 text-slate-600';
      } else if (text === 'Sama') {
        el.className = 'px-2 py-1 rounded text-xs font-mono transition-all bg-amber-500 text-slate-950 font-bold';
      } else {
        el.className = 'px-2 py-1 rounded text-xs font-mono transition-all bg-slate-800 text-amber-300 border border-slate-700';
      }
    }
  });
}

function clearHighlights() {
  tokenElements.forEach(el => {
    el.classList.remove('ring-2', 'ring-amber-400', 'scale-110', 'bg-amber-400', 'text-slate-950');
    const text = el.textContent;
    if (text === '·') {
      el.className = 'px-2 py-1 rounded text-xs font-mono transition-all bg-slate-900 text-slate-600';
    } else if (text === 'Sama') {
      el.className = 'px-2 py-1 rounded text-xs font-mono transition-all bg-amber-500 text-slate-950 font-bold';
    } else {
      el.className = 'px-2 py-1 rounded text-xs font-mono transition-all bg-slate-800 text-amber-300 border border-slate-700';
    }
  });
}

async function playKorvai(p, g) {
  await loadStrokes();

  const tempoBpm = 80;
  const subBeatTime = (60 / tempoBpm) / 4; 

  const gatiVal = parseInt(korvaiGati.value) || 4;
  let activeSyllables = gatiList.chatusra.syllables;
  if (gatiVal === 3) activeSyllables = gatiList.tishra.syllables;
  else if (gatiVal === 5) activeSyllables = gatiList.khanda.syllables;
  else if (gatiVal === 7) activeSyllables = gatiList.mishra.syllables;
  else if (gatiVal === 9) activeSyllables = gatiList.sankeerna.syllables;

  const singlePhrase = [];
  for (let i = 0; i < p; i++) {
    singlePhrase.push(activeSyllables[i % activeSyllables.length]);
  }

  const events = [];
  const visualTokens = [];
  let currentTime = 0;
  let tokenIdx = 0;

  const patternStructure = [
    { type: 'phrase', count: p },
    { type: 'gap', count: g },
    { type: 'phrase', count: p },
    { type: 'gap', count: g },
    { type: 'phrase', count: p }
  ];

  patternStructure.forEach((block) => {
    if (block.type === 'phrase') {
      for (let i = 0; i < block.count; i++) {
        const sollu = singlePhrase[i];
        events.push({
          time: currentTime,
          type: 'sollu',
          sollu: sollu,
          tokenIndex: tokenIdx
        });
        visualTokens.push({ text: sollu, type: 'phrase', index: tokenIdx });
        tokenIdx++;
        currentTime += subBeatTime;
      }
    } else {
      for (let i = 0; i < block.count; i++) {
        events.push({
          time: currentTime,
          type: 'gap',
          sollu: 'rest',
          tokenIndex: tokenIdx
        });
        visualTokens.push({ text: '·', type: 'gap', index: tokenIdx });
        tokenIdx++;
        currentTime += subBeatTime;
      }
    }
  });

  events.push({
    time: currentTime,
    type: 'sama',
    sollu: 'c',
    tokenIndex: tokenIdx
  });
  visualTokens.push({ text: 'Sama', type: 'sama', index: tokenIdx });

  renderVisualizer(visualTokens);

  scheduleEvents(
    events, 
    (ev) => {
      highlightToken(ev.tokenIndex);
    },
    () => {
      clearHighlights();
    }
  );
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
// --- 4. Strudel Integration & UI Note Highlighting ---

const runStrudelBtn = document.getElementById('runStrudelBtn');
const stopStrudelBtn = document.getElementById('stopStrudelBtn');
const strudelEditor = document.getElementById('strudelEditor');

let strudelSamplesLoaded = false;

async function registerMridangamSamples() {
  if (strudelSamplesLoaded) return;
  
  if (typeof samples === 'function') {
    // 1. Fetch default dirt drum bank for bd, cp, hh
    await samples('github:tidalcycles/dirt-samples');

    // 2. Register local Mridangam stroke samples
    await samples({
      bheem: '../assets/audio/strokes/bheem.wav',
      cha:   '../assets/audio/strokes/cha.wav',
      dheem: '../assets/audio/strokes/dheem.wav',
      dhin:  '../assets/audio/strokes/dhin.wav',
      num:   '../assets/audio/strokes/num.wav',
      ta:    '../assets/audio/strokes/ta.wav',
      tha:   '../assets/audio/strokes/tha.wav',
      tham:  '../assets/audio/strokes/tham.wav',
      thi:   '../assets/audio/strokes/thi.wav',
      thom:  '../assets/audio/strokes/thom.wav'
    });
    
    strudelSamplesLoaded = true;
    console.log('Strudel drum bank and Mridangam samples loaded.');
  }
}

function highlightStrudelSollu(event) {
  if (!event) return;

  // 1. Extract raw stroke name from all possible Strudel payload shapes
  let rawValue = '';
  if (typeof event.value === 'string') {
    rawValue = event.value;
  } else if (event.value && typeof event.value.s === 'string') {
    rawValue = event.value.s;
  } else if (typeof event.s === 'string') {
    rawValue = event.s;
  }

  if (!rawValue) return;

  // Clean string (e.g., "bheem:1" or "  THA  " -> "bheem" / "tha")
  let solluName = rawValue.split(':')[0].toLowerCase().trim();

  // 2. Map phonetic aliases so UI highlights match available stroke badges
  const ALIAS_MAP = {
    'ka': 'ta',
    'di': 'thi',
    'dhi': 'thi',
    'mi': 'num',
    'ki': 'ta',
    'nam': 'dhin'
  };

  if (ALIAS_MAP[solluName]) {
    solluName = ALIAS_MAP[solluName];
  }

  // 3. Find matching UI elements
  const activeElements = document.querySelectorAll(`[data-sollu="${solluName}"]`);

  // 4. Apply highlight animation
  activeElements.forEach(el => {
    el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-500', 'text-slate-950');
    
    // Remove highlight after 180ms
    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-500', 'text-slate-950');
    }, 180);
  });
}

// --- Initialize Strudel Runtime & Add Button Listeners ---

if (typeof initStrudel === 'function') {
  initStrudel();
  registerMridangamSamples();
}

if (runStrudelBtn && strudelEditor) {
  runStrudelBtn.addEventListener('click', async () => {
    await registerMridangamSamples();
    
    const code = strudelEditor.value;
    try {
      if (typeof evaluate === 'function') {
        const pattern = await evaluate(code);
        
        // Connect event listener to highlight UI notes on trigger/subscription
        if (pattern) {
          if (typeof pattern.onTrigger === 'function') {
            pattern.onTrigger((ev) => highlightStrudelSollu(ev));
          } else if (typeof pattern.subscribe === 'function') {
            pattern.subscribe((ev) => highlightStrudelSollu(ev));
          }
        }
      }
    } catch (err) {
      console.error("Strudel evaluation error:", err);
    }
  });

  // Shortcut key: Ctrl+Enter or Cmd+Enter to execute code
  strudelEditor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runStrudelBtn.click();
    }
  });
}

if (stopStrudelBtn) {
  stopStrudelBtn.addEventListener('click', () => {
    if (typeof hush === 'function') {
      hush();
    }
    document.querySelectorAll('[data-sollu]').forEach(el => {
      el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-500', 'text-slate-950');
    });
  });
}

let audioLoaded = false;
window.addEventListener('click', async () => {
  if (!audioLoaded) {
    await loadStrokes();
    audioLoaded = true;
  }
}, { once: true });