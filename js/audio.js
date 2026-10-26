// audio.js - Corrected Synthesis for Individual Sollu Timures

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

/**
 * Distinct, non-overlapping acoustic profiles for each sollu
 */
export function hit(type, when = null) {
  const ctx = initAudio();
  const startTime = when !== null ? when : ctx.currentTime;
  const sollu = type.toLowerCase();

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);

  if (sollu === 'ta') {
    // Sharp high-pitched right-head rim stroke (Ta)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, startTime);
    osc.frequency.exponentialRampToValueAtTime(200, startTime + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, startTime);
    filter.Q.setValueAtTime(4, startTime);

    gainNode.gain.setValueAtTime(0.4, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);

    osc.start(startTime);
    osc.stop(startTime + 0.045);
  } 
  else if (sollu === 'ka') {
    // Short, dry, muted slap (Ka)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, startTime);
    osc.frequency.exponentialRampToValueAtTime(70, startTime + 0.03);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, startTime);

    gainNode.gain.setValueAtTime(0.35, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.035);

    osc.start(startTime);
    osc.stop(startTime + 0.035);
  }
  else if (sollu === 'di') {
    // Open middle-register ring (Di)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, startTime);
    osc.frequency.exponentialRampToValueAtTime(150, startTime + 0.07);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, startTime);

    gainNode.gain.setValueAtTime(0.38, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.075);

    osc.start(startTime);
    osc.stop(startTime + 0.075);
  }
  else if (sollu === 'mi') {
    // Soft trailing resonant tap (Mi)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(290, startTime);
    osc.frequency.exponentialRampToValueAtTime(130, startTime + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, startTime);

    gainNode.gain.setValueAtTime(0.35, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.065);

    osc.start(startTime);
    osc.stop(startTime + 0.065);
  }
  else if (sollu === 'ki') {
    // Ultra-crisp high snap (Ki)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, startTime);
    osc.frequency.exponentialRampToValueAtTime(300, startTime + 0.03);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, startTime);
    filter.Q.setValueAtTime(5, startTime);

    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.035);

    osc.start(startTime);
    osc.stop(startTime + 0.035);
  }
  else if (sollu === 'dhi' || sollu === 'nam') {
    // Deep resonant bass composite (Dhi / Nam)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, startTime);
    osc.frequency.exponentialRampToValueAtTime(65, startTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, startTime);

    gainNode.gain.setValueAtTime(0.45, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.13);

    osc.start(startTime);
    osc.stop(startTime + 0.13);
  }
  else {
    // Resolution Sama strike
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, startTime);
    osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, startTime);

    gainNode.gain.setValueAtTime(0.5, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.13);

    osc.start(startTime);
    osc.stop(startTime + 0.13);
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