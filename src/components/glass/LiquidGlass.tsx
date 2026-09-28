import { useEffect, useState, type ReactNode } from 'react';
import GlassSurface from '@/components/reactbits/GlassSurface';

interface Props {
  children: ReactNode;
  className?: string;
  borderRadius?: number;
  height?: string;
}

export default function LiquidGlass({ children, className = '', borderRadius = 16, height = 'auto' }: Props) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (reduced) {
    return (
      <div className={`glass ${className}`} style={{ borderRadius, height }}>
        {children}
      </div>
    );
  }
  return (
    <GlassSurface
      width="100%"
      height={height}
      borderRadius={borderRadius}
      backgroundOpacity={0.05}
      saturation={1.7}
      className={className}
    >
      {children}
    </GlassSurface>
  );
}
