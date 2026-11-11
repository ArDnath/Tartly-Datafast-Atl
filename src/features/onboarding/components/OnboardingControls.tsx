import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { Copy, NavArrowLeft } from '@/components/icons';
import styles from '../Onboarding.module.css';

export function StepHeading({
  title,
  subtitle,
  index = 0,
}: {
  title: string;
  subtitle: string;
  index?: number;
}) {
  return (
    <div className={styles.heading} style={{ animationDelay: `${index * 70}ms` }}>
      <BrandMark size={44} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}

export function Reveal({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <div
      className={`${styles.reveal} ${className || ''}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {children}
    </div>
  );
}

export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

export function BackGlyph() {
  return (
    <NavArrowLeft
      aria-hidden="true"
      width={16}
      height={16}
      strokeWidth={1.8}
      style={{ display: 'block' }}
    />
  );
}

export function CopyGlyph() {
  return <Copy aria-hidden="true" width={14} height={14} strokeWidth={1.7} />;
}
