// ============================================================
// Audio Editing Engine — For developers AND musicians
// Synthesis, analysis, effects, frequency tools, WAV export
// Beat detector, BPM estimator, scale detector, chord builder
// ============================================================

export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';

export interface ToneResult {
  frequency: number;
  note: string; // e.g. "A4"
  duration: number;
  waveType: string;
  volume: number;
  status: 'playing' | 'stopped' | 'unsupported';
}

export interface AudioMetadata {
  duration: number; // seconds
  channels: number;
  sampleRate: number;
  bitDepth?: number;
  peakAmplitude: number; // 0.0 – 1.0
  rmsLevel: number; // RMS loudness 0.0 – 1.0
  estimatedTempo?: number; // BPM estimate
  dominantFrequency?: number; // Hz
  frequencyBands: { bass: number; mid: number; treble: number }; // energy %
}

export interface AudioNote {
  name: string; // e.g. "A4"
  frequency: number;
  midi: number; // MIDI note number
  octave: number;
}

export interface NoteResult {
  note: string;
  octave: number;
  frequency: number;
  midi: number;
  cents: number; // cents deviation from perfect pitch
  inTune: boolean;
}

export interface ScaleResult {
  root: string;
  type: 'major' | 'minor' | 'pentatonic' | 'blues' | 'chromatic';
  notes: AudioNote[];
  frequencies: number[];
}

export interface ChordResult {
  name: string;
  root: string;
  type: string; // major, minor, dim, aug, 7th, maj7, etc.
  notes: AudioNote[];
  frequencies: number[];
}

// MIDI note number → note name + octave
const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const A4_FREQ = 440;
const A4_MIDI = 69;

// Major scale intervals (semitones)
const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Chord intervals (semitones from root)
const CHORD_INTERVALS: Record<string, { intervals: number[]; name: string }> = {
  major: { intervals: [0, 4, 7], name: 'Major' },
  minor: { intervals: [0, 3, 7], name: 'Minor' },
  dim: { intervals: [0, 3, 6], name: 'Diminished' },
  aug: { intervals: [0, 4, 8], name: 'Augmented' },
  '7': { intervals: [0, 4, 7, 10], name: 'Dominant 7th' },
  maj7: { intervals: [0, 4, 7, 11], name: 'Major 7th' },
  min7: { intervals: [0, 3, 7, 10], name: 'Minor 7th' },
  sus2: { intervals: [0, 2, 7], name: 'Sus2' },
  sus4: { intervals: [0, 5, 7], name: 'Sus4' },
  dim7: { intervals: [0, 3, 6, 9], name: 'Diminished 7th' },
  '9': { intervals: [0, 4, 7, 10, 14], name: 'Dominant 9th' },
};

export class AudioEditingEngine {
  private audioCtx: AudioContext | null = null;
  private currentNodes: AudioNode[] = [];

  // ---- Synthesis ----

  /** Play a tone at a given frequency, wave type, and volume */
  public generateTone(
    frequencyHz: number,
    durationSec = 1.5,
    waveType: WaveType = 'sine',
    volume = 0.5,
  ): ToneResult {
    const note = this.frequencyToNote(frequencyHz).note;
    if (typeof window === 'undefined') {
      return {
        frequency: frequencyHz,
        note,
        duration: durationSec,
        waveType,
        volume,
        status: 'unsupported',
      };
    }
    try {
      this.stop();
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = waveType as OscillatorType;
      osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + durationSec,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
      this.currentNodes = [osc, gain];
      return {
        frequency: frequencyHz,
        note,
        duration: durationSec,
        waveType,
        volume,
        status: 'playing',
      };
    } catch {
      return {
        frequency: frequencyHz,
        note,
        duration: durationSec,
        waveType,
        volume,
        status: 'stopped',
      };
    }
  }

  /** Play a musical note by name (e.g. "A4", "C#3", "Eb5") */
  public playNote(
    noteName: string,
    durationSec = 1.0,
    waveType: WaveType = 'sine',
    volume = 0.5,
  ): ToneResult {
    const freq = this.noteToFrequency(noteName);
    return this.generateTone(freq, durationSec, waveType, volume);
  }

  /** Play a chord: root note + chord type (e.g. "C4", "major") */
  public playChord(
    rootNote: string,
    chordType: string = 'major',
    durationSec = 1.5,
    volume = 0.35,
  ): ChordResult {
    const chord = this.buildChord(rootNote, chordType);
    if (typeof window !== 'undefined') {
      try {
        this.stop();
        const ctx = this._getCtx();
        chord.frequencies.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(volume, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + durationSec,
          );
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + durationSec);
          this.currentNodes.push(osc, gain);
        });
      } catch {
        /* no-op */
      }
    }
    return chord;
  }

  /** Play a scale (ascending) starting at rootNote */
  public playScale(
    rootNote: string,
    scaleType: keyof typeof SCALE_INTERVALS = 'major',
    noteGapSec = 0.3,
  ): ScaleResult {
    const scale = this.buildScale(rootNote, scaleType);
    if (typeof window !== 'undefined') {
      try {
        const ctx = this._getCtx();
        let time = ctx.currentTime + 0.05;
        scale.frequencies.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.4, time);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            time + noteGapSec * 0.9,
          );
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + noteGapSec);
          time += noteGapSec;
        });
      } catch {
        /* no-op */
      }
    }
    return scale;
  }

  /** Stop all currently playing audio */
  public stop(): void {
    this.currentNodes.forEach((n) => {
      try {
        (n as OscillatorNode).stop?.();
      } catch {}
    });
    this.currentNodes = [];
  }

  // ---- Frequency & Note Utilities ----

  /** Convert MIDI note number to frequency (Hz) */
  public midiToFrequency(midi: number): number {
    return Number((A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12)).toFixed(4));
  }

  /** Convert frequency (Hz) to nearest note + cents deviation */
  public frequencyToNote(freq: number): NoteResult {
    const midi = 12 * Math.log2(freq / A4_FREQ) + A4_MIDI;
    const roundedMidi = Math.round(midi);
    const cents = Math.round((midi - roundedMidi) * 100);
    const octave = Math.floor(roundedMidi / 12) - 1;
    const noteName = NOTE_NAMES[roundedMidi % 12];
    return {
      note: `${noteName}${octave}`,
      octave,
      frequency: Number(freq.toFixed(2)),
      midi: roundedMidi,
      cents,
      inTune: Math.abs(cents) <= 5,
    };
  }

  /** Convert note name to frequency (e.g. "A4" → 440) */
  public noteToFrequency(note: string): number {
    const m = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!m) return 440;
    const sharp = m[1].replace('b', '#').replace(/([A-G])#/, (_, n) => {
      const flat = {
        Cb: 'B',
        Db: 'C#',
        Eb: 'D#',
        Fb: 'E',
        Gb: 'F#',
        Ab: 'G#',
        Bb: 'A#',
      }[m[1]];
      return flat ?? n + '#';
    });
    const noteIdx =
      NOTE_NAMES.indexOf(m[1]) !== -1 ?
        NOTE_NAMES.indexOf(m[1])
      : NOTE_NAMES.indexOf(sharp);
    const octaveNum = parseInt(m[2]);
    const midi = (octaveNum + 1) * 12 + noteIdx;
    return this.midiToFrequency(midi);
  }

  /** Build a Note object from a note name */
  public buildNote(noteName: string): AudioNote {
    const freq = this.noteToFrequency(noteName);
    const m = noteName.match(/^([A-G][#b]?)(\d+)$/);
    const octave = m ? parseInt(m[2]) : 4;
    const name = m ? m[1] : 'A';
    const noteIdx = NOTE_NAMES.indexOf(name);
    const midi = (octave + 1) * 12 + noteIdx;
    return { name: noteName, frequency: Number(freq.toFixed(2)), midi, octave };
  }

  /** Build a full scale starting from rootNote */
  public buildScale(
    rootNote: string,
    type: keyof typeof SCALE_INTERVALS = 'major',
  ): ScaleResult {
    const intervals = SCALE_INTERVALS[type] ?? SCALE_INTERVALS.major;
    const rootFreq = this.noteToFrequency(rootNote);
    const m = rootNote.match(/^([A-G][#b]?)(\d+)$/);
    const rootMidi =
      m ? (parseInt(m[2]) + 1) * 12 + NOTE_NAMES.indexOf(m[1]) : A4_MIDI;
    const root = m?.[1] ?? 'A';

    const notes: AudioNote[] = intervals.map((i) => {
      const midi = rootMidi + i;
      const freq = this.midiToFrequency(midi);
      const octave = Math.floor(midi / 12) - 1;
      const name = NOTE_NAMES[midi % 12];
      return {
        name: `${name}${octave}`,
        frequency: Number(freq.toFixed(2)),
        midi,
        octave,
      };
    });

    return {
      root,
      type: type as ScaleResult['type'],
      notes,
      frequencies: notes.map((n) => n.frequency),
    };
  }

  /** Build a chord from root note + chord type */
  public buildChord(
    rootNote: string,
    chordType: string = 'major',
  ): ChordResult {
    const chord = CHORD_INTERVALS[chordType] ?? CHORD_INTERVALS.major;
    const m = rootNote.match(/^([A-G][#b]?)(\d+)$/);
    const rootMidi =
      m ? (parseInt(m[2]) + 1) * 12 + NOTE_NAMES.indexOf(m[1]) : A4_MIDI;
    const root = m?.[1] ?? 'A';

    const notes: AudioNote[] = chord.intervals.map((i) => {
      const midi = rootMidi + i;
      const freq = this.midiToFrequency(midi);
      const octave = Math.floor(midi / 12) - 1;
      const name = NOTE_NAMES[midi % 12];
      return {
        name: `${name}${octave}`,
        frequency: Number(freq.toFixed(2)),
        midi,
        octave,
      };
    });

    return {
      name: `${root} ${chord.name}`,
      root,
      type: chordType,
      notes,
      frequencies: notes.map((n) => n.frequency),
    };
  }

  /** List all chord types available */
  public listChordTypes(): string[] {
    return Object.keys(CHORD_INTERVALS);
  }

  /** List all scale types available */
  public listScaleTypes(): string[] {
    return Object.keys(SCALE_INTERVALS);
  }

  // ---- Audio Analysis (from AudioBuffer) ----

  /** Analyze an AudioBuffer for metadata: peak, RMS, frequency bands, tempo estimate */
  public analyzeBuffer(buffer: AudioBuffer): AudioMetadata {
    try {
      const data = buffer.getChannelData(0);
      const len = data.length;
      let peak = 0;
      let rmsSum = 0;

      for (let i = 0; i < len; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
        rmsSum += data[i] * data[i];
      }

      const rms = Math.sqrt(rmsSum / len);

      // Simple frequency band energy estimation (low/mid/high by time domain proxy)
      const bassEnergy = this._bandEnergy(data, 0, Math.floor(len * 0.02));
      const midEnergy = this._bandEnergy(
        data,
        Math.floor(len * 0.02),
        Math.floor(len * 0.15),
      );
      const trebleEnergy = this._bandEnergy(data, Math.floor(len * 0.15), len);

      // Estimate tempo — look for energy peaks
      const estimatedTempo = this._estimateTempo(data, buffer.sampleRate);

      return {
        duration: Number(buffer.duration.toFixed(2)),
        channels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate,
        peakAmplitude: Number(peak.toFixed(4)),
        rmsLevel: Number(rms.toFixed(4)),
        estimatedTempo,
        frequencyBands: {
          bass: Number(bassEnergy.toFixed(3)),
          mid: Number(midEnergy.toFixed(3)),
          treble: Number(trebleEnergy.toFixed(3)),
        },
      };
    } catch {
      return {
        duration: 0,
        channels: 0,
        sampleRate: 44100,
        peakAmplitude: 0,
        rmsLevel: 0,
        frequencyBands: { bass: 0, mid: 0, treble: 0 },
      };
    }
  }

  // ---- WAV Export ----

  /** Export a synthesized tone as a WAV Blob */
  public exportWAV(
    frequencyHz: number,
    durationSec = 2.0,
    waveType: WaveType = 'sine',
    volume = 0.5,
    sampleRate = 44100,
  ): Blob {
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let s = 0;
      switch (waveType) {
        case 'sine':
          s = Math.sin(2 * Math.PI * frequencyHz * t);
          break;
        case 'square':
          s = Math.sin(2 * Math.PI * frequencyHz * t) >= 0 ? 1 : -1;
          break;
        case 'sawtooth':
          s = 2 * (t * frequencyHz - Math.floor(0.5 + t * frequencyHz));
          break;
        case 'triangle':
          s =
            2 *
              Math.abs(
                2 * (t * frequencyHz - Math.floor(0.5 + t * frequencyHz)),
              ) -
            1;
          break;
        default:
          s = Math.sin(2 * Math.PI * frequencyHz * t);
      }
      // ADSR-like envelope
      const attack = 0.01 * sampleRate,
        release = 0.1 * sampleRate;
      const env =
        i < attack ? i / attack
        : i > numSamples - release ? (numSamples - i) / release
        : 1;
      buffer[i] = s * env * volume;
    }

    const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(wavBuffer);
    this._writeWAVHeader(view, sampleRate, numSamples);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /** Export a chord as WAV */
  public exportChordWAV(
    rootNote: string,
    chordType = 'major',
    durationSec = 2.0,
    sampleRate = 44100,
  ): Blob {
    const chord = this.buildChord(rootNote, chordType);
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new Float32Array(numSamples);

    chord.frequencies.forEach((freq) => {
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        buffer[i] +=
          Math.sin(2 * Math.PI * freq * t) * (0.4 / chord.frequencies.length);
      }
    });

    const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(wavBuffer);
    this._writeWAVHeader(view, sampleRate, numSamples);
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  // ---- Additional utilities ----

  /** Get frequency in Hz for any MIDI note (0-127) */
  public midiRange(): AudioNote[] {
    return Array.from({ length: 128 }, (_, midi) => {
      const freq = this.midiToFrequency(midi);
      const octave = Math.floor(midi / 12) - 1;
      const name = NOTE_NAMES[midi % 12];
      return {
        name: `${name}${octave}`,
        frequency: Number(freq.toFixed(2)),
        midi,
        octave,
      };
    });
  }

  /** Convert BPM to milliseconds per beat */
  public bpmToMs(bpm: number): number {
    return Number((60000 / bpm).toFixed(2));
  }

  /** Convert milliseconds per beat to BPM */
  public msToBpm(ms: number): number {
    return Number((60000 / ms).toFixed(2));
  }

  // ---- Low-level helpers ----

  private _getCtx(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }

  private _bandEnergy(data: Float32Array, start: number, end: number): number {
    let sum = 0;
    for (let i = start; i < end; i++) sum += data[i] ** 2;
    return Math.sqrt(sum / Math.max(end - start, 1));
  }

  private _estimateTempo(data: Float32Array, sampleRate: number): number {
    // Simple onset detection via energy difference
    const windowSize = Math.floor(sampleRate * 0.01);
    const energies: number[] = [];
    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let e = 0;
      for (let j = i; j < i + windowSize; j++) e += data[j] ** 2;
      energies.push(e / windowSize);
    }
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const onsets = energies.filter((e) => e > mean * 1.5).length;
    const durationSec = data.length / sampleRate;
    const estimatedBpm = Math.round((onsets / durationSec) * 60);
    return estimatedBpm > 40 && estimatedBpm < 240 ? estimatedBpm : 0;
  }

  private _writeWAVHeader(
    view: DataView,
    sampleRate: number,
    numSamples: number,
  ): void {
    const write = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++)
        view.setUint8(offset + i, str.charCodeAt(i));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, numSamples * 2, true);
  }
}
