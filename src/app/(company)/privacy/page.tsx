import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Review our standard cookies policy and client-side on-device security guidelines. Operated by Basic Alley LLC.',
  keywords: [
    'Privacy Policy',
    'Data Protection',
    'No tracking policy',
    'Basic Alley LLC',
  ],
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
