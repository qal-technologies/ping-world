import type { Metadata } from 'next';
import TermsPage from './TermsClient';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Review our standard terms of use and acceptable services guidelines. Operated by Basic Alley LLC.',
  keywords: [
    'Terms of Use',
    'Privacy Agreement',
    'User Consent',
    'Basic Alley LLC',
  ],
};

export default function Terms() {
  return <TermsPage />;
}
