import StylingPreviewer from '@/components/dev-engines/StylingPreviewer';

export const metadata = {
  title: 'Responsive Glassmorphism Styling Decorator',
  description: 'Generate high-fidelity premium designs, liquid glass textures, custom button states, and live styling tokens.',
};

export default function StylingEngineUserPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-display">Glassmorphism Styling Decorator</h1>
        <p className="text-pw-muted text-sm mt-1">Generate high-fidelity premium designs, liquid glass textures, custom button states, and live styling tokens.</p>
      </div>
      <StylingPreviewer />
    </div>
  );
}
