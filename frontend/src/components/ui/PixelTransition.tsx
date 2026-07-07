import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PixelTransitionProps {
  active: boolean;
  onTransitionComplete?: () => void;
  pixelColor?: string;
  gridSize?: number; // number of columns/rows
}

export default function PixelTransition({
  active,
  onTransitionComplete,
  pixelColor = '#7c3aed', // primary violet
  gridSize = 10
}: PixelTransitionProps) {
  const [shouldRender, setShouldRender] = useState(active);

  useEffect(() => {
    if (active) {
      setShouldRender(true);
    }
  }, [active]);

  if (!shouldRender) return null;

  const totalPixels = gridSize * gridSize;
  const delayMultiplier = 0.5 / totalPixels;

  // Generate random order of indices for staggering
  const indices = Array.from({ length: totalPixels }, (_, i) => i);
  // Deterministic-ish random shuffle for cool visual patterns
  const shuffledIndices = [...indices].sort(() => Math.random() - 0.5);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] grid" style={{
      gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
      gridTemplateRows: `repeat(${gridSize}, 1fr)`,
    }}>
      {shuffledIndices.map((originalIndex, orderIndex) => {
        const delay = orderIndex * delayMultiplier;

        return (
          <motion.div
            key={originalIndex}
            style={{ backgroundColor: pixelColor }}
            initial={{ opacity: 0, scale: 0 }}
            animate={
              active
                ? {
                    opacity: [0, 0.9, 0.9, 0],
                    scale: [0, 1.05, 1.05, 0],
                    transition: {
                      duration: 0.7,
                      times: [0, 0.25, 0.75, 1],
                      delay: delay,
                      ease: "easeInOut"
                    }
                  }
                : {}
            }
            onAnimationComplete={() => {
              // Trigger completion after the last animation finishes
              if (orderIndex === totalPixels - 1) {
                setShouldRender(false);
                if (onTransitionComplete) onTransitionComplete();
              }
            }}
          />
        );
      })}
    </div>
  );
}
