'use client';
import { Row } from '@talivia/react-zen';
import { BrandWordmark } from '@/components/brand/BrandMark';
import Link from '@/components/common/Link';
import { useNavigation } from '@/components/hooks';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { UserButton } from '@/features/app-shell/components/UserButton';
import { BRAND } from '@/lib/brand';
import { APP_LAYOUT_MAX_WIDTH } from '@/lib/constants';

export function TopNav({ showUser = true }: { showUser?: boolean }) {
  const { renderUrl } = useNavigation();

  return (
    <Row width="100%" backgroundColor="transparent">
      <Row
        alignItems="center"
        justifyContent="space-between"
        paddingY="2"
        paddingX={{ base: '3', md: '6' }}
        width="100%"
        maxWidth={APP_LAYOUT_MAX_WIDTH}
        style={{ margin: '0 auto', minHeight: 56 }}
      >
        <Row alignItems="center" gap="2" minWidth="0">
          <Link
            href={renderUrl('/app', false)}
            aria-label={BRAND.name}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            <BrandWordmark size={24} />
          </Link>
        </Row>
        {showUser && (
          <Row alignItems="center" gap="3" style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
            <UserButton />
          </Row>
        )}
      </Row>
    </Row>
  );
}
