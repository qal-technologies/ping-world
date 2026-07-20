import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Review our standard cookies policy and client-side on-device security guidelines. Operated by Qal Technologies.',
  keywords: [
    'Privacy Policy',
    'Data Protection',
    'No tracking policy',
    'Qal Technologies',
  ],
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
