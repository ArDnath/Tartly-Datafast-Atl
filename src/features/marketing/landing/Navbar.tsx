'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { BrandLockup } from './BrandLockup';
import { scrollLandingToTop } from './LandingScroll';

const NAV_LINKS = [
  { name: 'Features', href: '/#features' },
  { name: 'Process', href: '/#process' },
  { name: 'Pricing', href: '/#pricing' },
  { name: 'Docs', href: '/docs' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);

  const handleBrandClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    scrollLandingToTop();
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setAtTop(currentScroll <= 4);

      if (currentScroll > lastScrollY.current && currentScroll > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      lastScrollY.current = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        aria-label="Main"
        className={`fixed top-0 left-0 z-40 w-full border-b transition-[transform,background-color,box-shadow,border-color] duration-300 ${atTop ? 'border-transparent bg-transparent shadow-none' : 'border-white/60 bg-canvas shadow-[0_8px_32px_rgba(31,41,55,0.08)]'} ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-4 md:px-16 lg:px-24 xl:px-32">
          <Link href="/#top" aria-label={BRAND.name} onClick={handleBrandClick}>
            <BrandLockup />
          </Link>

          <div className="hidden items-center gap-8 text-gray-600 md:flex">
            {NAV_LINKS.map(link => (
              <Link key={link.name} href={link.href} className="hover:text-gray-900">
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="rounded-lg px-6 py-2.5 hover:bg-gray-100">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-linear-to-b from-gray-700 to-gray-900 px-5 py-2 text-white transition hover:from-gray-800 hover:to-black"
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="transition active:scale-90 md:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="size-6.5" />
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-canvas/90 text-lg font-medium backdrop-blur-md transition-all duration-300 md:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!isOpen}
      >
        {NAV_LINKS.map(link => (
          <Link key={link.name} href={link.href} onClick={() => setIsOpen(false)}>
            {link.name}
          </Link>
        ))}

        <Link href="/login" onClick={() => setIsOpen(false)} className="px-6 py-2.5">
          Log in
        </Link>

        <Link
          href="/signup"
          onClick={() => setIsOpen(false)}
          className="rounded-lg bg-linear-to-b from-gray-700 to-gray-900 px-5 py-2 text-white"
        >
          Get started
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
          className="rounded-md bg-linear-to-b from-gray-700 to-gray-900 p-2 text-white ring-white active:ring-2"
        >
          <XIcon />
        </button>
      </div>

      <div className="h-18" />
    </>
  );
}
