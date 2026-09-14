'use client';

export type ConfettiType = 'standard' | 'fireworks' | 'stars' | 'ribbons';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRotation: number;
  alpha: number;
  decay: number;
  shape: 'rect' | 'circle' | 'star' | 'ribbon';
  width?: number;
  height?: number;
}

const PALETTE = [
  '#0EBAE1', '#6C3AEB', '#E100FF', '#38BDF8', '#F59E0B',
  '#10B981', '#EC4899', '#8B5CF6', '#F43F5E', '#FBBF24',
];

/**
 * Triggers confetti animation on the viewport with different creative effects.
 */
export function triggerConfetti(type: ConfettiType = 'standard', durationMs = 3500): () => void {
  if (typeof window === 'undefined') return () => {};

  let canvas = document.getElementById('pingworld-confetti-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'pingworld-confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '999999';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const resize = () => {
    if (!canvas) return;
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  resize();

  const particles: Particle[] = [];
  const width = window.innerWidth;
  const height = window.innerHeight;

  const createParticle = (originX: number, originY: number, forcedShape?: Particle['shape']): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    const shape = forcedShape || (
      type === 'stars' ? 'star' :
      type === 'ribbons' ? 'ribbon' :
      Math.random() > 0.4 ? 'rect' : 'circle'
    );

    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === 'standard' ? 4 : 2),
      size: type === 'ribbons' ? 6 + Math.random() * 4 : 5 + Math.random() * 7,
      width: type === 'ribbons' ? 4 + Math.random() * 3 : undefined,
      height: type === 'ribbons' ? 14 + Math.random() * 12 : undefined,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 8,
      alpha: 1,
      decay: 0.008 + Math.random() * 0.012,
      shape,
    };
  };

  // Initial burst
  if (type === 'standard') {
    for (let i = 0; i < 120; i++) {
      particles.push(createParticle(width / 2, height * 0.45));
    }
  } else if (type === 'stars') {
    for (let i = 0; i < 90; i++) {
      particles.push(createParticle(width * (0.2 + Math.random() * 0.6), height * 0.35, 'star'));
    }
  } else if (type === 'ribbons') {
    for (let i = 0; i < 80; i++) {
      particles.push(createParticle(width * Math.random(), -20, 'ribbon'));
    }
  }

  let animationFrameId: number;
  const startTime = performance.now();
  let lastFireworkTime = startTime;

  const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const render = (currentTime: number) => {
    ctx.clearRect(0, 0, width, height);

    // Fireworks ongoing rockets
    if (type === 'fireworks' && currentTime - startTime < durationMs) {
      if (currentTime - lastFireworkTime > 350) {
        lastFireworkTime = currentTime;
        const fx = width * (0.15 + Math.random() * 0.7);
        const fy = height * (0.2 + Math.random() * 0.4);
        for (let i = 0; i < 45; i++) {
          particles.push(createParticle(fx, fy));
        }
      }
    }

    // Ribbons continuing rain
    if (type === 'ribbons' && currentTime - startTime < durationMs && Math.random() < 0.3) {
      particles.push(createParticle(width * Math.random(), -10, 'ribbon'));
    }

    // Update & draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += type === 'ribbons' ? 0.08 : 0.22; // Gravity
      p.vx *= 0.985;
      p.rotation += p.vRotation;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > height + 50) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        drawStar(0, 0, 5, p.size, p.size / 2.2);
      } else if (p.shape === 'ribbon') {
        ctx.fillRect(-(p.width || 4) / 2, -(p.height || 16) / 2, p.width || 4, p.height || 16);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      ctx.restore();
    }

    if (particles.length > 0 && currentTime - startTime < durationMs + 2000) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, width, height);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };

  animationFrameId = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(animationFrameId);
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };
}
