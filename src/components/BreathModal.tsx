import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';

interface BreathModalProps {
  open: boolean;
  onClose: () => void;
}

interface BreathPhase {
  key: 'inhale' | 'hold' | 'exhale';
  label: string;
  enLabel: string;
  hint: string;
  durationSec: number;
}

const PHASES: BreathPhase[] = [
  {
    key: 'inhale',
    label: '缓缓吸气',
    enLabel: 'INHALE',
    hint: '经鼻轻柔吸入空气，感受胸腔舒展',
    durationSec: 4,
  },
  {
    key: 'hold',
    label: '宁静屏息',
    enLabel: 'HOLD',
    hint: '留住这份清澈，让思绪慢慢沉淀',
    durationSec: 7,
  },
  {
    key: 'exhale',
    label: '绵长呼气',
    enLabel: 'EXHALE',
    hint: '微张双唇缓慢呼出，松开肩颈紧绷',
    durationSec: 8,
  },
];

const CYCLE_TOTAL_SEC = PHASES.reduce((sum, p) => sum + p.durationSec, 0); // 19s

export const BreathModal: React.FC<BreathModalProps> = ({ open, onClose }) => {
  const [running, setRunning] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!open) {
      setRunning(true);
      setElapsedSec(0);
      lastTsRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (running) {
        if (lastTsRef.current === null) {
          lastTsRef.current = now;
        }
        const dt = Math.min((now - lastTsRef.current) / 1000, 0.12);
        lastTsRef.current = now;
        setElapsedSec((prev) => prev + dt);
      } else {
        lastTsRef.current = null;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [open, running]);

  if (!open) return null;

  const completedCycles = Math.floor(elapsedSec / CYCLE_TOTAL_SEC);
  const cyclePos = elapsedSec % CYCLE_TOTAL_SEC;

  let activePhase = PHASES[0];
  let phaseElapsed = cyclePos;
  let acc = 0;
  for (const p of PHASES) {
    if (cyclePos < acc + p.durationSec) {
      activePhase = p;
      phaseElapsed = cyclePos - acc;
      break;
    }
    acc += p.durationSec;
  }

  const phaseProgress = Math.min(1, Math.max(0, phaseElapsed / activePhase.durationSec));
  const phaseRemaining = Math.max(1, Math.ceil(activePhase.durationSec - phaseElapsed));

  // 平滑缓动计算光球缩放比例 (0.58 ~ 1.0)
  const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

  let orbScale = 0.6;
  let glowOpacity = 0.45;
  if (activePhase.key === 'inhale') {
    const e = easeInOutSine(phaseProgress);
    orbScale = 0.58 + e * 0.42;
    glowOpacity = 0.38 + e * 0.48;
  } else if (activePhase.key === 'hold') {
    // 屏息期细微悬停呼吸感
    const microPulse = Math.sin(phaseElapsed * 2.4) * 0.018;
    orbScale = 1.0 + microPulse;
    glowOpacity = 0.86 + microPulse * 2;
  } else {
    const e = easeInOutSine(phaseProgress);
    orbScale = 1.0 - e * 0.42;
    glowOpacity = 0.86 - e * 0.48;
  }

  // SVG 进度环参数
  const ringRadius = 112;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - phaseProgress);

  const handleReset = () => {
    setElapsedSec(0);
    setRunning(true);
    lastTsRef.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="4-7-8 呼吸疗愈模式"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#050912]/92 px-6 backdrop-blur-2xl"
      style={{
        paddingTop: 'max(20px, var(--safe-top))',
        paddingBottom: 'max(28px, var(--safe-bottom))',
      }}
    >
      {/* 顶部栏 */}
      <div className="flex w-full max-w-[400px] items-center justify-between">
        <div>
          <p className="text-[11px] tracking-[0.26em] text-[#7dd3c8]/80 uppercase">
            4 · 7 · 8 BREATHING
          </p>
          <h2 className="font-serif-display mt-0.5 text-lg tracking-wider text-white/95">
            呼吸疗愈
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="退出呼吸疗愈模式"
          className="glass-pill flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 中央律动光球 */}
      <div className="relative flex flex-col items-center justify-center">
        <div className="relative flex h-[280px] w-[280px] items-center justify-center">
          {/* 外层柔和氛围扩散光晕 */}
          <div
            className="pointer-events-none absolute rounded-full blur-3xl"
            style={{
              width: '250px',
              height: '250px',
              transform: `scale(${(orbScale * 1.16).toFixed(4)})`,
              opacity: glowOpacity * 0.72,
              background:
                'radial-gradient(circle, rgba(125,211,200,0.52) 0%, rgba(72,138,199,0.24) 55%, rgba(6,10,19,0) 75%)',
            }}
          />

          {/* SVG 轨道与阶段进度环 */}
          <svg
            viewBox="0 0 260 260"
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="130"
              cy="130"
              r={ringRadius}
              fill="none"
              stroke="rgba(220, 240, 250, 0.1)"
              strokeWidth="1.5"
            />
            <circle
              cx="130"
              cy="130"
              r={ringRadius}
              fill="none"
              stroke="url(#breathGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
            />
            <defs>
              <linearGradient id="breathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7dd3c8" />
                <stop offset="100%" stopColor="#93c5fd" />
              </linearGradient>
            </defs>
          </svg>

          {/* 呼吸律动核心光球 */}
          <div
            className="relative flex h-[186px] w-[186px] items-center justify-center rounded-full border border-white/25 shadow-2xl"
            style={{
              transform: `scale(${orbScale.toFixed(4)})`,
              background:
                'radial-gradient(circle at 35% 30%, rgba(210,248,244,0.48) 0%, rgba(108,200,196,0.28) 46%, rgba(28,58,92,0.52) 100%)',
              boxShadow: `0 0 42px rgba(125, 211, 200, ${(glowOpacity * 0.45).toFixed(3)}), inset 0 0 28px rgba(255,255,255,0.2)`,
            }}
          >
            {/* 内部液态微环 */}
            <div className="h-[74%] w-[74%] rounded-full border border-white/20 bg-white/5 backdrop-blur-sm" />
          </div>

          {/* 光球中心极简文字与秒数 */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] tracking-[0.28em] text-[#bff2ec]/80">
              {activePhase.enLabel}
            </span>
            <span className="font-mono-timer mt-1 text-4xl font-light text-white drop-shadow">
              {phaseRemaining}
            </span>
            <span className="font-serif-display mt-1 text-base tracking-[0.18em] text-white/95">
              {activePhase.label}
            </span>
          </div>
        </div>

        {/* 阶段引导文案 */}
        <p className="mt-6 max-w-[290px] text-center text-sm leading-relaxed text-white/65">
          {activePhase.hint}
        </p>

        {/* 三阶段指示胶囊 */}
        <div className="mt-6 flex items-center gap-2">
          {PHASES.map((p) => {
            const isCurrent = p.key === activePhase.key;
            return (
              <div
                key={p.key}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-all duration-300 ${
                  isCurrent
                    ? 'border border-[#7dd3c8]/45 bg-[#7dd3c8]/15 text-[#c8f5ee]'
                    : 'border border-white/8 bg-white/[0.03] text-white/40'
                }`}
              >
                {p.label.slice(2)} {p.durationSec}s
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部控制区 */}
      <div className="flex w-full max-w-[400px] flex-col items-center gap-4">
        <div className="flex items-center gap-6 text-xs text-white/50">
          <span>
            已完成 <strong className="font-mono-timer text-white/85">{completedCycles}</strong> 轮
          </span>
          <span className="h-3 w-px bg-white/15" />
          <span>
            专注呼吸{' '}
            <strong className="font-mono-timer text-white/85">
              {Math.floor(elapsedSec / 60)}:{String(Math.floor(elapsedSec % 60)).padStart(2, '0')}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            aria-label="重置呼吸计时"
            className="glass-pill flex h-12 w-12 items-center justify-center rounded-full text-white/75 transition hover:bg-white/15 hover:text-white active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="flex h-12 min-w-[144px] items-center justify-center gap-2 rounded-full border border-[#7dd3c8]/40 bg-[#7dd3c8]/18 px-6 text-sm font-medium text-[#e4faf7] shadow-lg transition hover:bg-[#7dd3c8]/28 active:scale-95"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{running ? '暂停节律' : '继续呼吸'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
