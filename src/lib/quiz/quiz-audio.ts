'use client';

/**
 * Native Web Audio API Sound Synthesizer for Quiz Events.
 * Zero external audio files required — generates rich, soothing harmonic audio buffers natively.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a calming, soothing dual-tone frequency chord (432Hz + 540Hz)
 * designed for mental focus, readiness, and calm presence when starting a quiz.
 */
export function playQuizStartTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 1.1;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.18, now + 0.09);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    masterGain.connect(ctx.destination);

    // Primary 432 Hz focus tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(432, now);
    osc1.frequency.exponentialRampToValueAtTime(436, now + duration);
    osc1.connect(masterGain);

    // Warm harmonic fifth (540 Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(540, now);
    osc2.frequency.exponentialRampToValueAtTime(544, now + duration);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch {
    // Graceful fallback if Web Audio is blocked
  }
}

/**
 * Plays an uplifting, resonant Major-7th chord progression
 * (528Hz -> 660Hz -> 792Hz -> 1056Hz) for achievement and completion vibes.
 */
export function playQuizCompletionTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Frequencies: 528Hz (Solfege love/transformation), 660Hz (E), 792Hz (G), 1056Hz (High C)
    const notes = [
      { freq: 528, time: 0.0, dur: 1.4, vol: 0.15 },
      { freq: 660, time: 0.12, dur: 1.5, vol: 0.13 },
      { freq: 792, time: 0.24, dur: 1.6, vol: 0.12 },
      { freq: 1056, time: 0.36, dur: 1.8, vol: 0.1 },
    ];

    notes.forEach(({ freq, time, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch {
    // Graceful fallback
  }
}
