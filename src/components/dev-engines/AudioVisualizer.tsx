'use client';

import { useState, useRef } from 'react';
import { Play, Square, Volume2, Music, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AudioEditingEngine } from '@/lib/dev-engines/audio-editing';

export default function AudioVisualizer() {
  const [freq, setFreq] = useState(440);
  const [waveType, setWaveType] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine');
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const engineRef = useRef(new AudioEditingEngine());

  const handlePlay = () => {
    try {
      engineRef.current.generateTone(freq, 2.0, waveType, volume);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 2000);
    } catch (e) {}
  };

  const handleStop = () => {
    engineRef.current.stop();
    setIsPlaying(false);
  };

  const handleDownload = () => {
    const blob = engineRef.current.exportWAV(freq, 2.0, waveType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pingworld_${waveType}_${freq}Hz.wav`;
    a.click();
  };

  return (
    <Card className="card-glow bkblur p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold font-display flex items-center gap-2">
          <Music className="h-5 w-5 text-pw-primary" />
          Web Audio Synthesizer & Visualizer
        </h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-bold ${isPlaying ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-white/5 text-pw-muted'}`}>
          {isPlaying ? 'PLAYING AUDIO...' : 'STOPPED'}
        </span>
      </div>

      {/* Waveform Visualizer Canvas Mock */}
      <div className="h-28 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden">
        <div className="flex items-center gap-1.5 h-full px-4 w-full justify-around">
          {Array.from({ length: 32 }).map((_, i) => {
            const h = isPlaying ? Math.floor(Math.sin(i + Date.now() * 0.01) * 35 + 45) : (i % 2 === 0 ? 12 : 6);
            return (
              <div
                key={i}
                className="w-1.5 bg-pw-primary rounded-full transition-all duration-75"
                style={{ height: `${h}%`, opacity: isPlaying ? 0.9 : 0.3 }}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Waveform Type</label>
          <div className="grid grid-cols-4 gap-2">
            {(['sine', 'square', 'sawtooth', 'triangle'] as const).map(w => (
              <Button
                key={w}
                variant={waveType === w ? 'default' : 'outline'}
                onClick={() => setWaveType(w)}
                className={`h-9 text-xs capitalize ${waveType === w ? 'bg-pw-primary text-black font-bold' : 'border-white/10'}`}
              >
                {w}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-pw-muted mb-2 block">Frequency: {freq} Hz</label>
          <input
            type="range"
            min="100"
            max="2000"
            step="10"
            value={freq}
            onChange={e => setFreq(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {!isPlaying ? (
          <Button onClick={handlePlay} className="flex-1 h-11 btn-primary font-bold gap-2">
            <Play className="h-4 w-4 fill-current" />
            Synthesize & Play Sound
          </Button>
        ) : (
          <Button onClick={handleStop} variant="destructive" className="flex-1 h-11 font-bold gap-2">
            <Square className="h-4 w-4 fill-current" />
            Stop Playback
          </Button>
        )}
        <Button onClick={handleDownload} variant="outline" className="h-11 border-white/10 gap-2">
          <Download className="h-4 w-4" />
          Export WAV
        </Button>
      </div>
    </Card>
  );
}
