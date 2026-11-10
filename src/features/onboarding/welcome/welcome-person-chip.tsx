'use client';

import { BrandMark } from '@/components/brand/BrandMark';
import styles from './Welcome.module.css';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Ported from the sibling app's welcome overlay. The brand mark is the
 * fallback avatar because this product signs people in with Google and may not
 * have a profile photo.
 */
export function WelcomePersonChip({
  name,
  image,
  useBrandLogo = false,
}: {
  name: string;
  image: string | null;
  useBrandLogo?: boolean;
}) {
  const avatar = useBrandLogo ? null : image;

  return (
    <span className={styles.chip}>
      <span className={styles.chipAvatar}>
        {useBrandLogo ? (
          <BrandMark size={24} />
        ) : avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className={styles.chipInitials}>{getInitials(name)}</span>
        )}
      </span>
      <span className={styles.chipName}>{name}</span>
    </span>
  );
}
