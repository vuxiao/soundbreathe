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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let smoothEnergy = 0;

    const particles: Particle[] = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.00018,
      vy: -0.00012 - Math.random() * 0.00024,
      alpha: 0.12 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let lastFrameTime = 0;

    const render = (now: number) => {
      rafId = window.requestAnimationFrame(render);

      // 节流至 ~36fps 降低移动端功耗
      if (now - lastFrameTime < 26) return;
      lastFrameTime = now;

      const t = prefersReducedMotion ? 0 : now * 0.001;
      const vols = volumesRef.current;
      const playing = playingRef.current;

      // 混合当前音频能量与配置权重
      const rawEnergy = playing ? soundEngine.getEnergyLevel() : 0;
      const mixWeight = Math.min(
        1,
        Object.values(vols).reduce((acc, v) => acc + v, 0) / 1.8
      );
      const targetEnergy = playing ? Math.max(mixWeight * 0.45, rawEnergy) : 0.08;
      smoothEnergy += (targetEnergy - smoothEnergy) * 0.07;

      // 计算主导混合色彩
      let rSum = 44;
      let gSum = 122;
      let bSum = 152;
      let weightSum = 0.35;

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

      // 深海基底渐变
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#060a14');
      bgGrad.addColorStop(0.52, '#08111c');
      bgGrad.addColorStop(1, '#050911');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 3 层有机呼吸流体光晕
      const breath = Math.sin(t * 0.65) * 0.08 + smoothEnergy * 0.32;

      const blobs = [
        {
          cx: width * (0.5 + Math.sin(t * 0.22) * 0.12),
          cy: height * (0.24 + Math.cos(t * 0.18) * 0.05),
          radius: Math.max(width, height) * (0.44 + breath * 0.26),
          color: `rgba(${domR}, ${domG}, ${domB}, ${(0.18 + smoothEnergy * 0.22).toFixed(3)})`,
        },
        {
          cx: width * (0.22 + Math.cos(t * 0.16) * 0.1),
          cy: height * (0.62 + Math.sin(t * 0.21) * 0.08),
          radius: Math.max(width, height) * (0.38 + breath * 0.18),
          color: `rgba(${Math.max(20, domR - 25)}, ${Math.min(230, domG + 20)}, ${Math.min(
            245,
            domB + 18
          )}, ${(0.11 + smoothEnergy * 0.14).toFixed(3)})`,
        },
        {
          cx: width * (0.82 + Math.sin(t * 0.19) * 0.08),
          cy: height * (0.78 + Math.cos(t * 0.14) * 0.07),
          radius: Math.max(width, height) * (0.34 + breath * 0.15),
          color: `rgba(48, 84, 138, ${(0.12 + smoothEnergy * 0.1).toFixed(3)})`,
        },
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.radius);
        g.addColorStop(0, b.color);
        g.addColorStop(0.55, b.color.replace(/[\d.]+\)$/, '0.03)'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 深海微尘粒子
      const speedScale = playing ? 1 + smoothEnergy * 1.4 : 0.3;
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

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
};
