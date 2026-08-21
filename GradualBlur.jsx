// Ported from React Bits <GradualBlur /> — React is global, no ES imports, no mathjs.
const { useEffect, useRef, useState, useMemo } = React;

const CURVES = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
  'ease-out': (p) => 1 - Math.pow(1 - p, 2),
  'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
};
const DIRS = { top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' };

function GradualBlur({
  position = 'bottom',
  strength = 2,
  height = '6rem',
  width = null,
  divCount = 5,
  exponential = false,
  curve = 'linear',
  opacity = 1,
  animated = false,
  duration = '0.3s',
  easing = 'ease-out',
  hoverIntensity = null,
  target = 'parent',
  zIndex = 1000,
  style = null
}) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(animated !== 'scroll');

  useEffect(() => {
    if (animated !== 'scroll' || !ref.current) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [animated]);

  const layers = useMemo(() => {
    const out = [];
    const inc = 100 / divCount;
    const s = hovered && hoverIntensity ? strength * hoverIntensity : strength;
    const curveFn = CURVES[curve] || CURVES.linear;
    for (let i = 1; i <= divCount; i++) {
      const p = curveFn(i / divCount);
      const blur = exponential ? Math.pow(2, p * 4) * 0.0625 * s : 0.0625 * (p * divCount + 1) * s;
      const p1 = Math.round((inc * i - inc) * 10) / 10;
      const p2 = Math.round(inc * i * 10) / 10;
      const p3 = Math.round((inc * i + inc) * 10) / 10;
      const p4 = Math.round((inc * i + inc * 2) * 10) / 10;
      let g = 'transparent ' + p1 + '%, black ' + p2 + '%';
      if (p3 <= 100) g += ', black ' + p3 + '%';
      if (p4 <= 100) g += ', transparent ' + p4 + '%';
      const mask = 'linear-gradient(' + (DIRS[position] || 'to bottom') + ', ' + g + ')';
      out.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            maskImage: mask,
            WebkitMaskImage: mask,
            backdropFilter: 'blur(' + blur.toFixed(3) + 'rem)',
            WebkitBackdropFilter: 'blur(' + blur.toFixed(3) + 'rem)',
            opacity,
            transition: animated && animated !== 'scroll' ? 'backdrop-filter ' + duration + ' ' + easing : undefined
          }}
        />
      );
    }
    return out;
  }, [position, strength, divCount, exponential, curve, opacity, animated, duration, easing, hovered, hoverIntensity]);

  const isPage = target === 'page';
  const vertical = position === 'top' || position === 'bottom';
  const box = {
    position: isPage ? 'fixed' : 'absolute',
    pointerEvents: hoverIntensity ? 'auto' : 'none',
    isolation: 'isolate',
    opacity: visible ? 1 : 0,
    transition: animated ? 'opacity ' + duration + ' ' + easing : undefined,
    zIndex: isPage ? zIndex + 100 : zIndex,
    ...(vertical
      ? { height, width: width || '100%', [position]: 0, left: 0, right: 0 }
      : { width: width || height, height: '100%', [position]: 0, top: 0, bottom: 0 }),
    ...(style || {})
  };

  return (
    <div
      ref={ref}
      style={box}
      onMouseEnter={hoverIntensity ? () => setHovered(true) : undefined}
      onMouseLeave={hoverIntensity ? () => setHovered(false) : undefined}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>{layers}</div>
    </div>
  );
}

module.exports = { GradualBlur };
