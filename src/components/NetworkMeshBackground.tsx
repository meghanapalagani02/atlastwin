import React, { useEffect, useRef } from 'react';

interface NetworkMeshBackgroundProps {
  className?: string;
  density?: number;
}

interface MeshNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export const NetworkMeshBackground: React.FC<NetworkMeshBackgroundProps> = ({
  className = '',
  density = 28,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const nodes: MeshNode[] = Array.from({ length: density }, (_, i) => ({
      x: ((i * 137.5) % width),
      y: ((i * 93.7) % height),
      vx: (((i % 5) - 2) * 0.14) || 0.08,
      vy: ((((i + 2) % 5) - 2) * 0.12) || -0.07,
      r: i % 4 === 0 ? 2.2 : 1.5,
    }));

    let rafId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const maxDist = Math.min(185, Math.max(125, width * 0.16));

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!prefersReducedMotion) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < 0 || a.x > width) a.vx *= -1;
          if (a.y < 0 || a.y > height) a.vy *= -1;
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.17;
            ctx.strokeStyle = `rgba(201, 162, 39, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = 'rgba(230, 212, 154, 0.34)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();

    const ro = new ResizeObserver(() => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
      if (prefersReducedMotion) draw();
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
};
