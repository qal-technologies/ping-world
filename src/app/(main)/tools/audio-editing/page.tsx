import AudioVisualizer from '@/components/dev-engines/AudioVisualizer';

export const metadata = {
  title: 'Audio Synthesizer & Editor',
  description: 'Synthesize custom frequency waveforms, upload audio tracks, analyze tempos, keys, and export trimmed WAV segments.',
};

export default function AudioEditingUserPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-display">Audio Synthesizer & Editor</h1>
        <p className="text-pw-muted text-sm mt-1">Synthesize custom frequency waveforms, upload audio tracks, analyze tempos, keys, and export trimmed WAV segments.</p>
      </div>
      <AudioVisualizer />
    </div>
  );
}
