import AlertToastRenderer from '@/components/dev-engines/AlertToastRenderer';

export const metadata = {
  title: 'Alert & Notification Center',
  description: 'Design and customize advanced interactive notifications, chime alerts, vibration sequences, and modal confirmations.',
};

export default function AlertingToastUserPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold font-display">Alert & Notification Center</h1>
        <p className="text-pw-muted text-sm mt-1">Design and customize advanced interactive notifications, chime alerts, vibration sequences, and modal confirmations.</p>
      </div>
      <AlertToastRenderer />
    </div>
  );
}
