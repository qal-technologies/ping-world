export interface ToneResult {
  frequency: number;
  duration: number;
  waveType: string;
  volume: number;
  status: 'playing' | 'stopped';
}

export class AudioEditingEngine {
  private audioCtx: AudioContext | null = null;
  private currentOsc: OscillatorNode | null = null;
  private currentGain: GainNode | null = null;

  public generateTone(
    frequencyHz: number,
    durationSec = 1.0,
    waveType: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine',
    volume = 0.5,
  ): ToneResult {
    if (typeof window === 'undefined') {
      return {
        frequency: frequencyHz,
        duration: durationSec,
        waveType,
        volume,
        status: 'stopped',
      };
    }

    try {
      this.stop();

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(frequencyHz, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioCtx.currentTime + durationSec,
      );

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationSec);

      this.currentOsc = osc;
      this.currentGain = gain;

      return {
        frequency: frequencyHz,
        duration: durationSec,
        waveType,
        volume,
        status: 'playing',
      };
    } catch (e) {
      return {
        frequency: frequencyHz,
        duration: durationSec,
        waveType,
        volume,
        status: 'stopped',
      };
    }
  }

  public stop(): void {
    if (this.currentOsc) {
      try {
        this.currentOsc.stop();
      } catch (e) {}
      this.currentOsc = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }

  public exportWAV(
    frequencyHz: number,
    durationSec = 2.0,
    waveType: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine',
    sampleRate = 44100,
  ): Blob {
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (waveType === 'sine') {
        sample = Math.sin(2 * Math.PI * frequencyHz * t);
      } else if (waveType === 'square') {
        sample = Math.sin(2 * Math.PI * frequencyHz * t) >= 0 ? 1 : -1;
      } else if (waveType === 'sawtooth') {
        sample = 2 * (t * frequencyHz - Math.floor(0.5 + t * frequencyHz));
      } else if (waveType === 'triangle') {
        sample =
          2 *
            Math.abs(
              2 * (t * frequencyHz - Math.floor(0.5 + t * frequencyHz)),
            ) -
          1;
      }

      // Envelope fade out
      const fade = Math.max(0, 1 - i / numSamples);
      buffer[i] = sample * fade * 0.5;
    }

    // Convert Float32 buffer to 16-bit PCM WAV Blob
    const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(wavBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
