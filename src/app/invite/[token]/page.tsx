import type { Metadata } from 'next';
import { InvitePage } from './InvitePage';

export default function () {
  return <InvitePage />;
}

export const metadata: Metadata = {
  title: 'Workspace invitation',
  robots: {
    index: false,
    follow: false,
  },
};
