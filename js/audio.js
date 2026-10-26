// audio.js - Web Audio API Synthesis and Precise Lookahead Scheduling

let audioCtx = null;
let masterGain = null;
let droneOscs = [];
let droneGain = null;
let schedulerTimer = null;

/**
 * Initializes the single AudioContext lazily on user interaction.
 */
export function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime); // Safe master volume level
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a single swara note using a sawtooth oscillator, lowpass filter, and AR envelope.
 */
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
  // Attack envelope
  gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
  // Release envelope
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);

  osc.start(startTime);
  osc.stop(startTime + dur);
}

/**
 * Plays a sequence of notes sequentially at a given tempo (BPM).
 */
export function playScale(freqs, tempo = 120, when = null) {
  const ctx = initAudio();
  const startTime = when !== null ? when : ctx.currentTime;
  const beatDuration = 60 / tempo;

  freqs.forEach((f, index) => {
    playNote(f, beatDuration * 0.9, startTime + (index * beatDuration));
  });
}

/**
 * Starts a continuous Tanpura-style drone (Sa - Pa - Sa).
 */
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

/**
 * Stops the active drone.
 */
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
 * Generates distinct tala hits and konnakol syllable sounds.
 */
export function hit(type, when = null) {
  const ctx = initAudio();
  const startTime = when !== null ? when : ctx.currentTime;

  if (type === 'sama' || type === 'clap') {
    const bufferSize = ctx.sampleRate * 0.05; // 50ms noise burst
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(type === 'sama' ? 1400 : 900, startTime);
    filter.Q.setValueAtTime(3, startTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);

    noise.start(startTime);
  } else if (type === 'wave') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, startTime);
    osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.15);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  } else if (type === 'syllable') {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, startTime);
    osc.frequency.exponentialRampToValueAtTime(260, startTime + 0.08);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.08);
  }
}

/**
 * Generic lookahead scheduler that schedules a list of events ({ time, type, freq, dur })
 * via ctx.currentTime without relying on setTimeout for beat precision.
 */
export function scheduleEvents(events, onEventCallback = null, onComplete = null) {
  const ctx = initAudio();
  const startTime = ctx.currentTime + 0.05;
  
  const sortedEvents = [...events].sort((a, b) => a.time - b.time);
  let eventIndex = 0;
  
  stopScheduler();

  const lookaheadInterval = 25; // ms
  const scheduleAheadTime = 0.1; // seconds

  schedulerTimer = setInterval(() => {
    const now = ctx.currentTime;
    
    while (eventIndex < sortedEvents.length && sortedEvents[eventIndex].time <= (now - startTime) + scheduleAheadTime) {
      const ev = sortedEvents[eventIndex];
      const absoluteTime = startTime + ev.time;

      if (ev.type === 'note') {
        playNote(ev.freq, ev.dur || 0.4, absoluteTime);
      } else {
        hit(ev.type, absoluteTime);
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