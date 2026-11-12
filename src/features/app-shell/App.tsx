'use client';
import { Column, Loading } from '@talivia/react-zen';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { AppLogoutButton } from '@/features/app-shell/AppLogoutButton';
import { TopNav } from '@/features/app-shell/TopNav';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { AppWelcomeOverlayGate } from '@/features/onboarding/welcome/AppWelcomeOverlayGate';
import { TrackerReminder } from '@/features/websites/components/TrackerReminder';
import { useWorkspacesQuery } from '@/features/workspaces/hooks/useWorkspacesQuery';
import { AppBillingGate } from './AppBillingGate';
import { UpdateNotice } from './UpdateNotice';

export function App({ children }) {
  const { user, isLoading, error } = useLoginQuery();
  const {
    data: workspaces = [],
    isLoading: workspacesLoading,
    isFetching: workspacesFetching,
  } = useWorkspacesQuery();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnUrl = `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;
  const loginRedirect = `/login?returnUrl=${encodeURIComponent(returnUrl || '/app')}`;

  // A signed-in user who has not finished the setup flow stays out of the app
  // shell. This covers both the first sign-in (no workspace yet) and a flow
  // abandoned after the first step (workspace created but not completed).
  useEffect(() => {
    if (!isLoading && user && user.onboardingRequired) {
      router.replace('/onboarding');
      return;
    }

    // Wait for an in-flight refetch. A stale empty list (for example the cache
    // from before onboarding finished) must not bounce the user back into the
    // flow they just completed.
    if (
      !isLoading &&
      user &&
      !workspacesLoading &&
      !workspacesFetching &&
      workspaces.length === 0
    ) {
      router.replace('/onboarding');
    }
  }, [isLoading, router, user, workspaces.length, workspacesFetching, workspacesLoading]);

  if (isLoading) {
    return <Loading placement="absolute" />;
  }

  if (error) {
    window.location.href = loginRedirect;
    return null;
  }

  if (!user) {
    return null;
  }

  if (user.onboardingRequired) {
    return <Loading placement="absolute" />;
  }

  if (!workspacesLoading && workspaces.length === 0) {
    return <Loading placement="absolute" />;
  }

  return (
    <Column
      className="talivia-app-shell"
      height="screen"
      overflowX="hidden"
      minHeight="0"
      position="relative"
    >
      <TopNav showUser />
      <AppBillingGate>{children}</AppBillingGate>
      {user.isAdmin && <UpdateNotice userId={user.id} />}
      <TrackerReminder />
      <AppLogoutButton />
      <AppWelcomeOverlayGate />
    </Column>
  );
}
