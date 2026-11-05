import type { Metadata } from 'next';
import { SignupPage } from './SignupPage';

export default function () {
  return <SignupPage />;
}

export const metadata: Metadata = {
  title: 'Create account',
  robots: {
    index: false,
    follow: false,
  },
};
