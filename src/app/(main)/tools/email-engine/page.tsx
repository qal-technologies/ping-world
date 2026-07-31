import EmailPreviewer from '@/components/dev-engines/EmailPreviewer';

export const metadata = {
  title: 'Responsive Email Template Builder',
  description: 'Visually arrange elements, buttons, headers, and footer downlinks to compose beautiful emails ready for Gmail and Outlook.',
};

export default function EmailEngineUserPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-display">Responsive Email Template Builder</h1>
        <p className="text-pw-muted text-sm mt-1">Visually arrange elements, buttons, headers, and footer downlinks to compose beautiful emails ready for Gmail and Outlook.</p>
      </div>
      <EmailPreviewer />
    </div>
  );
}
