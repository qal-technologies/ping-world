import AutocorrectStudio from '@/components/dev-engines/AutocorrectStudio';

export const metadata = {
  title: 'AutoCorrect Studio',
  description: 'Clean and verify your text with our phonetic typo corrector and live spell checker.',
};

export default function AutocorrectUserPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-display">AutoCorrect Studio</h1>
        <p className="text-pw-muted text-sm mt-1">Clean and verify your text with our phonetic typo corrector and live spell checker.</p>
      </div>
      <AutocorrectStudio />
    </div>
  );
}
