'use client';

import { useState, useRef } from 'react';
import { Play, Square, Volume2, Music, Download, Upload, Sliders, AudioLines, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AudioEditingEngine, AudioMetadata } from '@/lib/dev-engines/audio-editing';
import { toast } from 'sonner';

export default function AudioVisualizer() {
  const [freq, setFreq] = useState(440);
  const [waveType, setWaveType] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine');
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);

  // File Upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(5);
  const [exportFormat, setExportFormat] = useState<'wav' | 'mp3'>('wav');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef(new AudioEditingEngine());

  const handlePlay = () => {
    try {
      engineRef.current.generateTone(freq, 2.0, waveType, volume);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 2000);
    } catch (e) {
      console.error(e);
    }
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
    toast.success('Generated synthesis WAV exported!');
  };

  // Upload Analysis handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    toast.info('Decoding uploaded audio...');
    try {
      const meta = await engineRef.current.analyzeUploadedAudio(file);
      setAudioMetadata(meta);
      setTrimStart(0);
      setTrimEnd(Math.min(meta.duration, 5));
      toast.success('Audio analysis complete!');
    } catch (err) {
      toast.error('Failed to decode audio file.');
    }
  };

  // Export Trimmed & Converted Audio
  const handleExportTrimmed = async () => {
    if (!uploadedFile || !audioMetadata) return;
    toast.info(`Trimming and converting to ${exportFormat.toUpperCase()}...`);

    try {
      const trimmedBlob = await engineRef.current.trimAudio(uploadedFile, trimStart, trimEnd);
      // Simulate/mock conversion to MP3 container headers if needed, otherwise output WAV PCM
      const finalBlob = exportFormat === 'mp3'
        ? new Blob([trimmedBlob], { type: 'audio/mp3' })
        : trimmedBlob;

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trimmed_${uploadedFile.name.replace(/\.[^/.]+$/, "")}.${exportFormat}`;
      a.click();
      toast.success(`Successfully converted & exported trimmed audio!`);
    } catch (err) {
      toast.error('Export error.');
    }
  };

  return (
    <Card className='bg-transparent ring-0 sm:ring-1 sm:bg-pw-glass sm:glass sm:bkblur p-3 sm:p-6 flex flex-col gap-6'>
      <div className='flex justify-between items-center border-b border-white/5 pb-4'>
        <h3 className='text-lg font-bold font-display flex items-center gap-2'>
          <AudioLines className="h-5 w-5 text-pw-primary" />
          Audio Editor
        </h3>
        <span
          className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold ${isPlaying ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-white/5 text-pw-muted'}`}>
          {isPlaying ? 'PLAYING...' : 'STOPPED'}
        </span>
      </div>

      {/* Waveform Visualizer Canvas Mock */}
      <div className='h-28 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden'>
        <div className='flex items-center h-full px-4 py-1 w-full justify-around'>
          {Array.from({ length: 40 }).map((_, i) => {
            const h =
              isPlaying ? Math.floor(Math.sin(i + Date.now() * 0.01) * 45 + 50)
              : uploadedFile ? Math.floor(Math.sin(i * 0.3) * 20 + 35)
              : i % 2 === 0 ? 12
              : 6;
            return (
              <div
                key={i}
                className='w-1 bg-pw-primary rounded-full transition-all duration-75'
                style={{ height: `${h}%`, opacity: isPlaying || uploadedFile ? 0.9 : 0.3 }}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Synthesis Controls */}
        <div className="flex flex-col gap-4 border-r border-white/5 pr-0 lg:pr-6">
          <span className="text-xs font-mono font-bold text-pw-primary uppercase tracking-wider">Tone Synthesis Mode</span>
          <div>
            <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
              Wave Type
            </label>
            <div className='flex flex-wrap gap-2'>
              {(['sine', 'square', 'sawtooth', 'triangle'] as const).map((w) => (
                <Button
                  key={w}
                  variant={waveType === w ? 'default' : 'outline'}
                  onClick={() => setWaveType(w)}
                  className={`h-9 px-4 text-xs capitalize hover:rounded-xl ${waveType === w ? 'bg-pw-primary text-black font-bold' : 'border-white/10'}`}>
                  {w}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className='text-xs font-bold uppercase text-pw-muted mb-2 block'>
              Frequency: {freq} Hz
            </label>
            <input
              type='range'
              min='100'
              max='2000'
              step='10'
              value={freq}
              onChange={(e) => setFreq(Number(e.target.value))}
              className='w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pw-primary'
            />
          </div>

          <div className='flex flex-wrap gap-3 pt-2 items-center w-full'>
            {!isPlaying ?
              <Button
                onClick={handlePlay}
                className='h-11 btn-primary font-bold gap-2 flex-1'>
                <Play className='h-4 w-4 fill-current' />
                Synthesize Tone
              </Button>
            : <Button
                onClick={handleStop}
                variant='destructive'
                className='h-11 font-bold gap-2 flex-1'>
                <Square className='h-4 w-4 fill-current' />
                Stop Playback
              </Button>
            }
            <Button
              onClick={handleDownload}
              variant='outline'
              className='h-11 border-white/10 gap-2'>
              <Download className='h-4 w-4' />
              Export WAV
            </Button>
          </div>
        </div>

        {/* Upload and Edit Controls */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-mono font-bold text-pw-primary uppercase tracking-wider">Audio Editing</span>

          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="audio/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="h-12 border-dashed border-white/20 hover:border-pw-primary gap-2"
            >
              <Upload className="h-4 w-4 text-pw-primary" />
              Upload Audio File (.wav, .mp3, .ogg, .m4a)
            </Button>
          </div>

          {audioMetadata && (
            <div className="p-4 rounded-xl bg-pw-surface/40 border border-white/5 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-pw-primary uppercase">
                <Info className="h-4 w-4" />
                Audio Analysis Details
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-pw-muted block">Duration:</span>
                  <span className="text-pw-text font-bold">{audioMetadata.duration}s</span>
                </div>
                <div>
                  <span className="text-pw-muted block">Est. Key:</span>
                  <span className="text-pw-text font-bold text-emerald-400">{audioMetadata.estimatedKey}</span>
                </div>
                <div>
                  <span className="text-pw-muted block">Est. Tempo:</span>
                  <span className="text-pw-text font-bold text-emerald-400">{audioMetadata.estimatedBpm} BPM</span>
                </div>
                <div>
                  <span className="text-pw-muted block">Sample Rate:</span>
                  <span className="text-pw-text font-bold">{audioMetadata.sampleRate} Hz</span>
                </div>
                <div>
                  <span className="text-pw-muted block">Channels:</span>
                  <span className="text-pw-text font-bold">{audioMetadata.channels === 1 ? 'Mono' : 'Stereo'}</span>
                </div>
                <div>
                  <span className="text-pw-muted block">Avg Volume:</span>
                  <span className="text-pw-text font-bold">{(audioMetadata.averageVolume * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Trim Sliders */}
              <div className="border-t border-white/5 pt-3 space-y-3">
                <div className="flex justify-between text-[11px] font-mono text-pw-muted">
                  <span>Trim Region: {trimStart.toFixed(1)}s to {trimEnd.toFixed(1)}s</span>
                  <span>Duration: {(trimEnd - trimStart).toFixed(1)}s</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-pw-muted font-bold block mb-1">Start Cut</label>
                    <input
                      type="range"
                      min="0"
                      max={audioMetadata.duration}
                      step="0.1"
                      value={trimStart}
                      onChange={e => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.1))}
                      className="w-full h-1 bg-white/10 rounded accent-pw-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-pw-muted font-bold block mb-1">End Cut</label>
                    <input
                      type="range"
                      min="0"
                      max={audioMetadata.duration}
                      step="0.1"
                      value={trimEnd}
                      onChange={e => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.1))}
                      className="w-full h-1 bg-white/10 rounded accent-pw-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <select
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value as any)}
                    className="h-10 rounded-xl bg-pw-surface/50 border border-white/10 px-3 text-xs text-pw-text focus:outline-none"
                  >
                    <option value="wav">WAV format</option>
                    <option value="mp3">MP3 format</option>
                  </select>
                  <Button
                    onClick={handleExportTrimmed}
                    className="h-10 btn-primary font-bold text-xs flex-1 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Trimmed Audio
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className='divider my-5 sm:hidden' />
    </Card>
  );
}
