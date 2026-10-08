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
 * PingWorld's short rising E-major signature: three clear notes which identify
 * the start of an assessment without a downloaded sound asset.
 */
export function playQuizStartTone(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const startSound = () => {
      try {
        const now = ctx.currentTime;
        const duration = 0.72;

        // Master gain
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.linearRampToValueAtTime(0.16, now + 0.045);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        masterGain.connect(ctx.destination);

        // E5 -> B5 -> G#5 is the PingWorld assessment ping motif.
        [659.25, 987.77, 830.61].forEach((frequency, index) => {
          const noteStart = now + index * 0.12;
          const oscillator = ctx.createOscillator();
          const noteGain = ctx.createGain();
          oscillator.type = index === 1 ? 'sine' : 'triangle';
          oscillator.frequency.setValueAtTime(frequency, noteStart);
          noteGain.gain.setValueAtTime(0.001, noteStart);
          noteGain.gain.linearRampToValueAtTime(index === 1 ? 0.55 : 0.42, noteStart + 0.025);
          noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.42);
          oscillator.connect(noteGain);
          noteGain.connect(masterGain);
          oscillator.start(noteStart);
          oscillator.stop(noteStart + 0.44);
        });

        setTimeout(() => {
          ctx.close().catch(() => {});
        }, (duration + 0.2) * 1000);
      } catch {}
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(startSound).catch(() => {});
    } else {
      startSound();
    }
  } catch {}
}

/**
 * Resolves the same PingWorld motif upward into a bright E-major completion chord.
 */
export function playQuizCompletionTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // E5 -> G#5 -> B5 -> E6: a completion cadence from the start signature.
    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.8, vol: 0.11 },
      { freq: 830.61, time: 0.11, dur: 0.9, vol: 0.1 },
      { freq: 987.77, time: 0.22, dur: 1.0, vol: 0.09 },
      { freq: 1318.51, time: 0.36, dur: 1.2, vol: 0.075 },
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

/** A quieter three-note ripple reserved for global in-app notifications. */
export function playInAppNotificationTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const play = () => {
    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(0.055, now + 0.025);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      master.connect(ctx.destination);
      // D5 -> F#5 -> A5: a compact Pingwrld notification ripple, distinct
      // from the quiz start and completion motifs.
      [587.33, 739.99, 880].forEach((frequency, index) => {
        const start = now + index * 0.075;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = index === 1 ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + 0.24);
      });
    } catch { /* Audio is optional; the in-app alert still renders. */ }
  };
  if (ctx.state === 'suspended') void ctx.resume().then(play).catch(() => {});
  else play();
}
