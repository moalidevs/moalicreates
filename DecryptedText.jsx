// Ported from React Bits <DecryptedText /> — no ES imports (React is global), no motion dependency.
const { useEffect, useState, useRef, useMemo, useCallback } = React;

const srOnly = {
  position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px',
  overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0
};

function DecryptedText({
  text = '',
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  animateOn = 'hover',
  encryptedStyle = null,
  delay = 0,
  hoverTarget = 'self'
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(true);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const availableChars = useMemo(
    () => (useOriginalCharsOnly ? Array.from(new Set(text.split(''))).filter((c) => c !== ' ') : characters.split('')),
    [useOriginalCharsOnly, text, characters]
  );

  const shuffleText = useCallback(
    (original, revealed) => original.split('').map((char, i) => {
      if (char === ' ' || char === '\n') return char;
      if (revealed.has(i)) return original[i];
      return availableChars[Math.floor(Math.random() * availableChars.length)];
    }).join(''),
    [availableChars]
  );

  const triggerDecrypt = useCallback(() => {
    if (reduce) return;
    setRevealedIndices(new Set());
    setIsDecrypted(false);
    setIsAnimating(true);
  }, [reduce]);

  useEffect(() => {
    if (!isAnimating) return;
    let iteration = 0;
    const nextIndex = (set) => {
      const len = text.length;
      if (revealDirection === 'end') return len - 1 - set.size;
      if (revealDirection === 'center') {
        const mid = Math.floor(len / 2);
        const off = Math.floor(set.size / 2);
        const n = set.size % 2 === 0 ? mid + off : mid - off - 1;
        if (n >= 0 && n < len && !set.has(n)) return n;
        for (let i = 0; i < len; i++) if (!set.has(i)) return i;
        return 0;
      }
      return set.size;
    };
    intervalRef.current = setInterval(() => {
      setRevealedIndices((prev) => {
        if (sequential) {
          if (prev.size < text.length) {
            const set = new Set(prev);
            set.add(nextIndex(prev));
            setDisplayText(shuffleText(text, set));
            return set;
          }
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          setIsDecrypted(true);
          setDisplayText(text);
          return prev;
        }
        setDisplayText(shuffleText(text, prev));
        iteration++;
        if (iteration >= maxIterations) {
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          setDisplayText(text);
          setIsDecrypted(true);
        }
        return prev;
      });
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [isAnimating, text, speed, maxIterations, sequential, revealDirection, shuffleText]);

  useEffect(() => {
    if (animateOn !== 'view' && animateOn !== 'inViewHover') return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          setTimeout(triggerDecrypt, delay);
        }
      });
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [animateOn, hasAnimated, triggerDecrypt, delay]);

  const hoverProps = (animateOn === 'hover' || animateOn === 'inViewHover') && hoverTarget === 'self'
    ? {
        onMouseEnter: () => { if (!isAnimating) triggerDecrypt(); },
        onMouseLeave: () => {
          clearInterval(intervalRef.current);
          setIsAnimating(false);
          setRevealedIndices(new Set());
          setDisplayText(text);
          setIsDecrypted(true);
        }
      }
    : {};

  // hoverTarget="card": the whole project card is the hover surface, so pointing at the
  // thumbnail scrambles its title. Fine pointers only — taps must not trigger it.
  useEffect(() => {
    if (hoverTarget !== 'card') return;
    if (animateOn !== 'hover' && animateOn !== 'inViewHover') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = containerRef.current;
    const card = el && (el.closest('a') || el.parentElement);
    if (!card) return;
    const enter = () => { if (!isAnimating) triggerDecrypt(); };
    const leave = () => {
      clearInterval(intervalRef.current);
      setIsAnimating(false);
      setRevealedIndices(new Set());
      setDisplayText(text);
      setIsDecrypted(true);
    };
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointerleave', leave);
    return () => {
      card.removeEventListener('pointerenter', enter);
      card.removeEventListener('pointerleave', leave);
    };
  }, [hoverTarget, animateOn, isAnimating, triggerDecrypt, text]);

  return (
    <span ref={containerRef} style={{ display: 'inline', whiteSpace: 'pre-wrap' }} {...hoverProps}>
      <span style={srOnly}>{text}</span>
      <span aria-hidden="true">
        {displayText.split('').map((char, i) => {
          const done = revealedIndices.has(i) || (!isAnimating && isDecrypted);
          return <span key={i} style={done ? undefined : (encryptedStyle || { opacity: 0.55 })}>{char}</span>;
        })}
      </span>
    </span>
  );
}

module.exports = { DecryptedText };
