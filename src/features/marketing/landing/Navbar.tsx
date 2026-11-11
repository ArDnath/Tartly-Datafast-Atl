'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  OpenBook as BookOpenIcon,
  DollarCircle as CircleDollarSignIcon,
  MultiplePages as LayersIcon,
  Menu as MenuIcon,
  MapsArrow as RouteIcon,
  Xmark as XIcon,
} from '@/components/icons';
import { BRAND } from '@/lib/brand';
import { BrandLockup } from './BrandLockup';
import { scrollLandingToTop } from './LandingScroll';
import { subscribeScroll } from './motion/scrollFrame';
import { createNavScrollState, resolveNavScroll } from './navScrollState';

const NAV_LINKS = [
  { name: 'Features', href: '/#features', icon: LayersIcon },
  { name: 'Process', href: '/#process', icon: RouteIcon },
  { name: 'Pricing', href: '/#pricing', icon: CircleDollarSignIcon },
  { name: 'Docs', href: '/docs', icon: BookOpenIcon },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleBrandClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    scrollLandingToTop();
  };

  useEffect(() => {
    let state = createNavScrollState(window.scrollY);

    // A restored scroll position can already be below the fold; React's initial
    // state assumes the top, so sync the shadow once before listening.
    setAtTop(state.atTop);

    return subscribeScroll(() => {
      const result = resolveNavScroll(state, window.scrollY);
      state = result.state;

      if (result.atTopChanged) {
        setAtTop(state.atTop);
      }

      if (result.showChanged) {
        setShowNavbar(state.show);
      }
    });
  }, []);

  // Move focus into the overlay, close it with Escape, and hand focus back
  // to the trigger. Without this the overlay traps keyboard users.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        menuButtonRef.current?.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <nav
        aria-label="Main"
        className={`fixed top-0 right-0 left-0 z-40 transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div
          className={`mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 rounded-b-xl border border-t-0 border-lp-line bg-lp-canvas/85 px-4 backdrop-blur-md transition-shadow duration-200 md:px-5 ${
            atTop ? 'shadow-none' : 'shadow-[0_10px_30px_-18px_rgba(23,23,23,0.35)]'
          }`}
        >
          <Link href="/#top" aria-label={BRAND.name} onClick={handleBrandClick}>
            <BrandLockup size={28} />
          </Link>

          <div className="hidden items-center rounded-full border border-lp-line/70 bg-lp-secondary/60 p-1 md:flex">
            {NAV_LINKS.map(link => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-lp-fg-muted transition-colors hover:bg-lp-canvas hover:text-lp-ink"
                >
                  <Icon className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-lp-ink transition-colors hover:bg-lp-secondary"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex h-9 items-center rounded-lg bg-lp-primary px-4 text-sm font-bold text-white shadow-[0_6px_18px_-6px_rgba(255,79,0,0.55)] transition-[filter,translate] duration-150 ease-out hover:brightness-105 active:translate-y-px"
            >
              Start free
            </Link>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-lp-ink transition-transform duration-150 ease-out enabled:active:scale-[0.96] md:hidden"
            aria-label="Open menu"
            aria-expanded={isOpen}
            aria-controls="landing-mobile-menu"
          >
            <MenuIcon className="size-6" />
          </button>
        </div>
      </nav>

      <div
        id="landing-mobile-menu"
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain bg-lp-canvas/95 text-lg font-medium backdrop-blur-md transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:hidden ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        {NAV_LINKS.map(link => (
          <Link
            key={link.name}
            href={link.href}
            onClick={() => setIsOpen(false)}
            className="text-lp-ink"
          >
            {link.name}
          </Link>
        ))}

        <Link href="/login" onClick={() => setIsOpen(false)} className="px-6 py-2.5">
          Log in
        </Link>

        <Link
          href="/signup"
          onClick={() => setIsOpen(false)}
          className="rounded-lg bg-lp-primary px-6 py-2.5 font-bold text-white"
        >
          Start free
        </Link>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
          className="size-10 rounded-lg border border-lp-line bg-lp-card p-2 text-lp-ink transition-transform duration-150 ease-out enabled:active:scale-[0.96]"
        >
          <XIcon />
        </button>
      </div>
    </>
  );
}
