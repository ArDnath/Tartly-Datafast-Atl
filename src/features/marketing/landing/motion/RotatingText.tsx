'use client';

import {
  AnimatePresence,
  animate as animateValue,
  type HTMLMotionProps,
  MotionConfig,
  motion,
  type TargetAndTransition,
  type Transition,
  useMotionValue,
  useReducedMotion,
} from 'motion/react';
import {
  type CSSProperties,
  forwardRef,
  type MouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './RotatingText.css';

type Effect = 'slide' | 'flip' | 'blur' | 'scale' | 'drop';
type Direction = 'up' | 'down';
type SplitBy = 'characters' | 'words' | 'lines' | string;
type StaggerFrom = 'first' | 'last' | 'center' | 'random' | number;
type MotionPreset = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
  exitTransition?: Transition;
};

export type RotatingTextHandle = {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
};

export type RotatingTextProps = Omit<
  HTMLMotionProps<'span'>,
  | 'children'
  | 'initial'
  | 'animate'
  | 'exit'
  | 'transition'
  | 'style'
  | 'onMouseEnter'
  | 'onMouseLeave'
> & {
  texts: string[];
  effect?: Effect;
  direction?: Direction;
  highlight?: boolean;
  highlightColor?: string;
  rotationInterval?: number;
  blur?: number;
  staggerDuration?: number;
  staggerFrom?: StaggerFrom;
  splitBy?: SplitBy;
  loop?: boolean;
  auto?: boolean;
  pauseOnHover?: boolean;
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
  transition?: Transition;
  animatePresenceMode?: 'wait' | 'sync';
  animatePresenceInitial?: boolean;
  onNext?: (index: number) => void;
  onMouseEnter?: (event: MouseEvent<HTMLSpanElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLSpanElement>) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
  style?: CSSProperties;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('en', { granularity: 'grapheme' })
    : null;

const splitIntoCharacters = (text: string) =>
  segmenter ? Array.from(segmenter.segment(text), segment => segment.segment) : Array.from(text);

const withFilter = (state: TargetAndTransition, filter: string): TargetAndTransition => ({
  ...state,
  filter,
});

const LAYOUT_SPRING = { type: 'spring', damping: 25, stiffness: 300 } as const;
const WIDTH_SPRING = { type: 'spring', damping: 34, stiffness: 320 } as const;
const FLIP_STYLE = { transformOrigin: '50% 50% -0.45em', backfaceVisibility: 'hidden' } as const;

const EFFECTS: Record<Effect, (up: boolean) => MotionPreset> = {
  slide: up => ({
    initial: { y: up ? '100%' : '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: up ? '-120%' : '120%', opacity: 0 },
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  }),
  flip: up => ({
    initial: { rotateX: up ? -90 : 90, opacity: 0, transformPerspective: 480 },
    animate: { rotateX: 0, opacity: 1, transformPerspective: 480 },
    exit: { rotateX: up ? 90 : -90, opacity: 0, transformPerspective: 480 },
    transition: { type: 'tween', duration: 0.6, ease: [0.34, 1.4, 0.64, 1] },
    exitTransition: { type: 'tween', duration: 0.32, ease: [0.5, 0, 0.75, 0] },
  }),
  blur: up => ({
    initial: { y: up ? '45%' : '-45%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: up ? '-45%' : '45%', opacity: 0 },
    transition: { type: 'tween', duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
  scale: up => ({
    initial: { scale: up ? 0.35 : 1.7, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: up ? 1.7 : 0.35, opacity: 0 },
    transition: { type: 'spring', damping: 17, stiffness: 240 },
  }),
  drop: () => ({
    initial: { y: '-110%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '110%', opacity: 0 },
    transition: { type: 'spring', damping: 18, stiffness: 320, mass: 0.9 },
    exitTransition: { type: 'tween', duration: 0.3, ease: [0.55, 0, 1, 0.45] },
  }),
};

function readableText(color: string): string | undefined {
  const value = color.trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  let rgb: number[] | null = null;

  if (hex) {
    const digits =
      hex[1].length < 6
        ? [...hex[1].slice(0, 3)].map(character => character + character).join('')
        : hex[1].slice(0, 6);
    rgb = [0, 2, 4].map(index => Number.parseInt(digits.slice(index, index + 2), 16));
  } else {
    const match = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (match) rgb = match.slice(1, 4).map(Number);
  }

  if (!rgb) return undefined;
  const [red, green, blue] = rgb.map(channel => {
    const normalized = Math.min(Math.max(channel / 255, 0), 1);
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.3 ? '#0b0b0c' : '#ffffff';
}

const RotatingText = forwardRef<RotatingTextHandle, RotatingTextProps>((props, ref) => {
  const {
    texts,
    transition,
    initial,
    animate,
    exit,
    effect = 'slide',
    direction = 'up',
    highlight = false,
    highlightColor = '#a855f7',
    animatePresenceMode = 'wait',
    animatePresenceInitial = false,
    rotationInterval = 2000,
    staggerDuration = 0,
    staggerFrom = 'first',
    loop = true,
    auto = true,
    pauseOnHover = false,
    blur = 0,
    splitBy = 'characters',
    onNext,
    onMouseEnter,
    onMouseLeave,
    mainClassName,
    splitLevelClassName,
    elementLevelClassName,
    style,
    ...rest
  } = props;

  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const indexRef = useRef(0);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  const contentRef = useRef<HTMLSpanElement>(null);
  const width = useMotionValue<string | number>('auto');
  const reduceMotion = useReducedMotion();
  const lastIndex = Math.max(texts.length - 1, 0);
  const activeIndex = Math.min(currentTextIndex, lastIndex);

  const elements = useMemo(() => {
    const currentText = texts[activeIndex] ?? '';
    if (splitBy === 'characters') {
      const words = currentText.split(' ');
      return words.map((word, index) => ({
        characters: splitIntoCharacters(word),
        needsSpace: index !== words.length - 1,
      }));
    }
    if (splitBy === 'words') {
      return currentText.split(' ').map((word, index, allWords) => ({
        characters: [word],
        needsSpace: index !== allWords.length - 1,
      }));
    }
    if (splitBy === 'lines') {
      return currentText.split('\n').map((line, index, allLines) => ({
        characters: [line],
        needsSpace: index !== allLines.length - 1,
      }));
    }
    return currentText.split(splitBy).map((part, index, allParts) => ({
      characters: [part],
      needsSpace: index !== allParts.length - 1,
    }));
  }, [texts, activeIndex, splitBy]);

  const order = useMemo(() => {
    const total = elements.reduce((sum, word) => sum + word.characters.length, 0);
    const shuffled = Array.from({ length: total }, (_, index) => index).sort(
      () => Math.random() - 0.5,
    );
    return { total, shuffled };
  }, [elements]);

  const getStaggerDelay = useCallback(
    (index: number) => {
      const { total, shuffled } = order;
      if (staggerFrom === 'first') return index * staggerDuration;
      if (staggerFrom === 'last') return (total - 1 - index) * staggerDuration;
      if (staggerFrom === 'center')
        return Math.abs(Math.floor(total / 2) - index) * staggerDuration;
      if (staggerFrom === 'random') return (shuffled[index] ?? index) * staggerDuration;
      return Math.abs(staggerFrom - index) * staggerDuration;
    },
    [order, staggerFrom, staggerDuration],
  );

  const goTo = useCallback(
    (index: number) => {
      if (index === indexRef.current || texts.length === 0) return;
      indexRef.current = index;
      setCurrentTextIndex(index);
      onNextRef.current?.(index);
    },
    [texts.length],
  );

  const next = useCallback(() => {
    const current = Math.min(indexRef.current, lastIndex);
    goTo(current < lastIndex ? current + 1 : loop ? 0 : current);
  }, [lastIndex, loop, goTo]);

  const previous = useCallback(() => {
    const current = Math.min(indexRef.current, lastIndex);
    goTo(current > 0 ? current - 1 : loop ? lastIndex : current);
  }, [lastIndex, loop, goTo]);

  const jumpTo = useCallback(
    (index: number) => goTo(Math.max(0, Math.min(index, lastIndex))),
    [goTo, lastIndex],
  );
  const reset = useCallback(() => goTo(0), [goTo]);

  useImperativeHandle(ref, () => ({ next, previous, jumpTo, reset }), [
    next,
    previous,
    jumpTo,
    reset,
  ]);

  const paused = pauseOnHover && hovered;

  useEffect(() => {
    if (!auto || paused || texts.length < 2) return;
    const timeoutId = setTimeout(next, rotationInterval);
    return () => clearTimeout(timeoutId);
  }, [next, rotationInterval, auto, paused, activeIndex, texts.length]);

  useIsomorphicLayoutEffect(() => {
    const content = contentRef.current;
    if (!highlight || !content) {
      width.set('auto');
      return undefined;
    }

    let controls: ReturnType<typeof animateValue> | undefined;
    let settled = false;
    const fitWidth = () => {
      const target = content.offsetWidth + 1;
      controls?.stop();
      if (!settled || reduceMotion) {
        settled = true;
        width.set(target);
        return;
      }
      controls = animateValue(width, target, WIDTH_SPRING);
    };

    fitWidth();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitWidth) : undefined;
    observer?.observe(content);
    return () => {
      observer?.disconnect();
      controls?.stop();
    };
  }, [highlight, reduceMotion, width]);

  const handleMouseEnter = (event: MouseEvent<HTMLSpanElement>) => {
    if (pauseOnHover) setHovered(true);
    onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLSpanElement>) => {
    setHovered(false);
    onMouseLeave?.(event);
  };

  const motionPreset = (EFFECTS[effect] ?? EFFECTS.slide)(direction !== 'down');
  const blurAmount = blur > 0 ? blur : effect === 'blur' ? 10 : 0;
  const enterState = initial ?? motionPreset.initial;
  const restState = animate ?? motionPreset.animate;
  const leaveState = exit ?? motionPreset.exit;
  const charTransition = transition ?? motionPreset.transition;
  const exitTransition = transition || exit ? undefined : motionPreset.exitTransition;
  const enterFrom = blurAmount > 0 ? withFilter(enterState, `blur(${blurAmount}px)`) : enterState;
  const enterTo = blurAmount > 0 ? withFilter(restState, 'blur(0px)') : restState;
  const leaveTo = blurAmount > 0 ? withFilter(leaveState, `blur(${blurAmount}px)`) : leaveState;
  const charStyle = effect === 'flip' ? FLIP_STYLE : undefined;

  const blockStyle = highlight
    ? {
        ...style,
        width,
        backgroundColor: highlightColor,
        color: readableText(highlightColor) ?? style?.color,
      }
    : style;

  const presence = (
    <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
      <motion.span
        key={activeIndex}
        className={splitBy === 'lines' ? 'text-rotate-lines' : 'text-rotate-content'}
        layout={!highlight}
        aria-hidden="true"
      >
        {elements.map((word, wordIndex, allWords) => {
          const previousCount = allWords
            .slice(0, wordIndex)
            .reduce((sum, item) => sum + item.characters.length, 0);
          return (
            <span key={wordIndex} className={`text-rotate-word ${splitLevelClassName ?? ''}`}>
              {word.characters.map((character, characterIndex) => {
                const delay = getStaggerDelay(previousCount + characterIndex);
                return (
                  <motion.span
                    key={characterIndex}
                    initial={enterFrom}
                    animate={enterTo}
                    exit={
                      exitTransition
                        ? { ...leaveTo, transition: { ...exitTransition, delay } }
                        : leaveTo
                    }
                    transition={{ ...charTransition, delay }}
                    className={`text-rotate-element ${elementLevelClassName ?? ''}`}
                    style={charStyle}
                  >
                    {character}
                  </motion.span>
                );
              })}
              {word.needsSpace && <span className="text-rotate-space"> </span>}
            </span>
          );
        })}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <MotionConfig reducedMotion="user">
      <motion.span
        className={`text-rotate ${highlight ? 'text-rotate-highlight' : ''} ${mainClassName ?? ''}`}
        {...rest}
        style={blockStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        layout={!highlight}
        transition={transition ?? LAYOUT_SPRING}
      >
        <span className="text-rotate-sr-only">{texts[activeIndex]}</span>
        {highlight ? (
          <span ref={contentRef} className="text-rotate-highlight-content">
            {presence}
          </span>
        ) : (
          presence
        )}
      </motion.span>
    </MotionConfig>
  );
});

RotatingText.displayName = 'RotatingText';
export default RotatingText;
