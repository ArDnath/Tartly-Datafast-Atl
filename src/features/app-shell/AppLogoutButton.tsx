'use client';

import { Icon } from '@talivia/react-zen';
import Link from '@/components/common/Link';
import { useMessages } from '@/components/hooks';
import { LogOut } from '@/components/icons';

/**
 * One quiet way out of the product. It lives in the bottom-left corner on every
 * signed-in surface, away from the working area and the account menu.
 */
export function AppLogoutButton() {
  const { t, labels } = useMessages();

  return (
    <Link
      href="/logout"
      className="app-logout"
      aria-label={t(labels.logout)}
      title={t(labels.logout)}
    >
      <Icon size="sm">
        <LogOut />
      </Icon>
      <span className="app-logout-label">{t(labels.logout)}</span>
    </Link>
  );
}
