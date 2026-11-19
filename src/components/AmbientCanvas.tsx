import React, { useEffect, useRef } from 'react';
import { TRACKS, type MixVolumes } from '../config/site';
import { soundEngine } from '../audio/SoundEngine';

interface AmbientCanvasProps {
  volumes: MixVolumes;
  isPlaying: boolean;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

export const AmbientCanvas: React.FC<AmbientCanvasProps> = ({ volumes, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const volumesRef = useRef<MixVolumes>(volumes);
  const playingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    volumesRef.current = volumes;
  }, [volumes]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let lastResizeWidth = 0;
    let lastResizeHeight = 0;
    let rafId = 0;
    let smoothEnergy = 0.08;
    let lastDrawTime = 0;

    const particles: Particle[] = Array.from({ length: 24 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.00016,
      vy: -0.0001 - Math.random() * 0.00022,
      alpha: 0.12 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
    }));

    /**
     * 独立同步绘制函数：保证在首帧与任何尺寸重设后立刻绘制，绝不出现空白闪烁帧
     */
    const drawFrame = (now: number) => {
      if (width <= 0 || height <= 0) return;

      const t = prefersReducedMotion ? 0 : now * 0.001;
      const vols = volumesRef.current;
      const playing = playingRef.current;

      const rawEnergy = playing ? soundEngine.getEnergyLevel() : 0;
      const mixWeight = Math.min(
        1,
        Object.values(vols).reduce((acc, v) => acc + v, 0) / 1.8
      );
      const targetEnergy = playing ? Math.max(mixWeight * 0.45, rawEnergy) : 0.08;
      smoothEnergy += (targetEnergy - smoothEnergy) * 0.07;

      // 计算混合主色调
      let rSum = 44;
      let gSum = 128;
      let bSum = 152;
      let weightSum = 0.45;

      for (const track of TRACKS) {
        const v = vols[track.id] || 0;
        if (v > 0.02) {
          rSum += track.glowRgba[0] * v;
          gSum += track.glowRgba[1] * v;
          bSum += track.glowRgba[2] * v;
          weightSum += v;
        }
      }

      const domR = Math.round(rSum / weightSum);
      const domG = Math.round(gSum / weightSum);
      const domB = Math.round(bSum / weightSum);

      // 深海基底渐变（全量覆盖，保证 alpha:false 下无残留）
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#060a14');
      bgGrad.addColorStop(0.52, '#08111c');
      bgGrad.addColorStop(1, '#050911');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 3 层有机流体光晕
      const breath = Math.sin(t * 0.65) * 0.08 + smoothEnergy * 0.3;

      const blobs = [
        {
          cx: width * (0.5 + Math.sin(t * 0.22) * 0.11),
          cy: height * (0.22 + Math.cos(t * 0.18) * 0.045),
          radius: Math.max(width, height) * (0.43 + breath * 0.24),
          color: `rgba(${domR}, ${domG}, ${domB}, ${(0.17 + smoothEnergy * 0.2).toFixed(3)})`,
        },
        {
          cx: width * (0.22 + Math.cos(t * 0.16) * 0.09),
          cy: height * (0.6 + Math.sin(t * 0.2) * 0.07),
          radius: Math.max(width, height) * (0.37 + breath * 0.16),
          color: `rgba(${Math.max(20, domR - 22)}, ${Math.min(228, domG + 18)}, ${Math.min(
            242,
            domB + 16
          )}, ${(0.1 + smoothEnergy * 0.13).toFixed(3)})`,
        },
        {
          cx: width * (0.82 + Math.sin(t * 0.19) * 0.07),
          cy: height * (0.78 + Math.cos(t * 0.14) * 0.06),
          radius: Math.max(width, height) * (0.33 + breath * 0.14),
          color: `rgba(46, 86, 136, ${(0.11 + smoothEnergy * 0.09).toFixed(3)})`,
        },
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.radius);
        g.addColorStop(0, b.color);
        g.addColorStop(0.55, b.color.replace(/[\d.]+\)$/, '0.028)'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 深海微尘粒子
      const speedScale = playing ? 1 + smoothEnergy * 1.3 : 0.28;
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx * speedScale;
          p.y += p.vy * speedScale;
          if (p.y < -0.02) {
            p.y = 1.02;
            p.x = Math.random();
          }
          if (p.x < -0.02) p.x = 1.02;
          if (p.x > 1.02) p.x = -0.02;
        }
        const twinkle = 0.55 + 0.45 * Math.sin(t * 1.1 + p.phase);
        ctx.fillStyle = `rgba(210, 238, 245, ${(p.alpha * twinkle * (0.5 + smoothEnergy)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    /**
     * 防闪屏 resize 策略：
     * 仅当宽度变化或高度变化超过 160px（如横竖屏切换）时重设画布缓冲区，
     * 忽略移动端上下滑动时地址栏伸缩导致的微小高度抖动；
     * 重设后立即同步绘制一帧，杜绝清空黑帧。
     */
    const applySizeIfNeeded = (force: boolean) => {
      const nextW = Math.round(canvas.clientWidth || window.innerWidth);
      const nextH = Math.round(canvas.clientHeight || window.innerHeight);
      if (nextW <= 0 || nextH <= 0) return;

      const widthChanged = Math.abs(nextW - lastResizeWidth) > 1;
      const majorHeightChanged = Math.abs(nextH - lastResizeHeight) > 160;

      if (!force && !widthChanged && !majorHeightChanged) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = nextW;
      height = nextH;
      lastResizeWidth = nextW;
      lastResizeHeight = nextH;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 立即同步绘制，绝不留空帧
      drawFrame(performance.now());
    };

    const handleResize = () => applySizeIfNeeded(false);

    applySizeIfNeeded(true);
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    const loop = (now: number) => {
      rafId = window.requestAnimationFrame(loop);
      if (now - lastDrawTime < 28) return;
      lastDrawTime = now;
      drawFrame(now);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="ambient-canvas"
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 h-[100lvh] min-h-screen w-screen"
      style={{ transform: 'translateZ(0)', willChange: 'transform' }}
    />
  );
};
