// js/audio.js

const STROKE_FILES = {
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
};

const audioBuffers = {};
let isLoaded = false;

let audioCtx = null;
let masterGain = null;
let droneOscs = [];
let droneGain = null;
let schedulerTimer = null;

export function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export async function loadStrokes() {
  const ctx = initAudio();

  const loadPromises = Object.entries(STROKE_FILES).map(async ([key, path]) => {
    try {
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for path: ${path}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(`File at ${path} is HTML (check folder structure)`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error(`File at ${path} is empty`);
      }

      audioBuffers[key] = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (err) {
      console.error(`Failed to load stroke audio (${key}):`, err.message || err);
    }
  });

  await Promise.all(loadPromises);
  isLoaded = true;
  console.log('Finished loading stroke audio samples.');
}

export function hit(type, when = null) {
  const ctx = initAudio();
  const startTime = when !== null ? when : ctx.currentTime;
  let sollu = type.toLowerCase().trim();

  // Return silently for rests and non-audio tokens
  if (sollu === 'rest' || sollu === '·' || sollu === '' || sollu === 'sama') {
    return;
  }

  // Map phonetic aliases to available stroke samples
  const ALIAS_MAP = {
    'ka': 'tha',
    'di': 'thi',
    'dhi': 'thi',
    'mi': 'num',
    'ki': 'ta',
    'nam': 'dhin'
  };

  if (ALIAS_MAP[sollu]) {
    sollu = ALIAS_MAP[sollu];
  }

  const buffer = audioBuffers[sollu];

  if (!buffer) {
    console.warn(`No audio buffer loaded for stroke key: "${type}" (mapped to "${sollu}")`);
    return;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(1.0, startTime);

  source.connect(gainNode);
  gainNode.connect(masterGain);

  source.start(startTime);
}

export function playNote(freq, dur = 0.5, when = null) {
  const ctx = initAudio();
  const startTime = when !== null ? when : ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, startTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1500, startTime);
  filter.Q.setValueAtTime(2, startTime);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.001, startTime);
  gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);

  osc.start(startTime);
  osc.stop(startTime + dur);
}

export function playScale(freqs, tempo = 120, when = null) {
  const ctx = initAudio();
  const startTime = when !== null ? when : ctx.currentTime;
  const beatDuration = 60 / tempo;

  freqs.forEach((f, index) => {
    playNote(f, beatDuration * 0.9, startTime + (index * beatDuration));
  });
}

export function startDrone(saHz) {
  const ctx = initAudio();
  stopDrone();

  droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0.12, ctx.currentTime);
  droneGain.connect(masterGain);

  const freqs = [saHz, saHz * 1.5, saHz * 2];
  
  droneOscs = freqs.map((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700 + i * 200, ctx.currentTime);

    osc.connect(filter);
    filter.connect(droneGain);
    osc.start();
    return osc;
  });
}

export function stopDrone() {
  if (droneOscs.length > 0) {
    droneOscs.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    droneOscs = [];
  }
  if (droneGain && audioCtx) {
    droneGain.disconnect();
    droneGain = null;
  }
}

export function scheduleEvents(events, onEventCallback = null, onComplete = null) {
  const ctx = initAudio();
  const startTime = ctx.currentTime + 0.05;
  
  const sortedEvents = [...events].sort((a, b) => a.time - b.time);
  let eventIndex = 0;
  
  stopScheduler();

  const lookaheadInterval = 25;
  const scheduleAheadTime = 0.1;

  schedulerTimer = setInterval(() => {
    const now = ctx.currentTime;
    
    while (eventIndex < sortedEvents.length && sortedEvents[eventIndex].time <= (now - startTime) + scheduleAheadTime) {
      const ev = sortedEvents[eventIndex];
      const absoluteTime = startTime + ev.time;

      if (ev.type === 'note') {
        playNote(ev.freq, ev.dur || 0.4, absoluteTime);
      } else {
        hit(ev.sollu || ev.type, absoluteTime);
      }

      if (onEventCallback) {
        const delayMs = Math.max(0, (absoluteTime - ctx.currentTime) * 1000);
        setTimeout(() => onEventCallback(ev, eventIndex), delayMs);
      }

      eventIndex++;
    }

    if (eventIndex >= sortedEvents.length) {
      stopScheduler();
      if (onComplete) {
        const finalEventTime = startTime + sortedEvents[sortedEvents.length - 1].time;
        const finalDelay = Math.max(0, (finalEventTime - ctx.currentTime) * 1000) + 100;
        setTimeout(onComplete, finalDelay);
      }
    }
  }, lookaheadInterval);
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}